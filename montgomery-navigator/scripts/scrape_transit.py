"""
Scrape Montgomery Area Transit System (The M Transit) route and schedule data
via Bright Data Scraping Browser (Playwright over CDP).
"""

import asyncio
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright, Page

from transit_record_builder import build_route_record

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BRIGHT_DATA_WSS = (
    "wss://brd-customer-hl_9067ef31-zone-scraping_browser1"
    ":54iofevfivh1@brd.superproxy.io:9222"
)
ROUTES_URL = "https://themtransit.com/routes/"
SYSTEM_MAP_URL = "https://themtransit.com/system-map/"
OUTPUT_PATH = Path(__file__).parent / "data" / "transit_routes.json"

ROUTE_NUM_PATTERN = re.compile(r"/route-(\d+)")
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 10


# ---------------------------------------------------------------------------
# Browser helpers -- fresh Playwright + browser per page load
# ---------------------------------------------------------------------------
async def scrape_single_url(url: str, js_code: str, wait_ms: int = 3000) -> dict:
    """Connect to Bright Data, load one URL, evaluate JS, close, and return."""
    for attempt in range(1, MAX_RETRIES + 1):
        pw = await async_playwright().start()
        browser = None
        try:
            print(f"[*] Connecting for {url} (attempt {attempt}) ...")
            browser = await pw.chromium.connect_over_cdp(BRIGHT_DATA_WSS)
            page = await browser.new_page()
            await _safe_goto(page, url)
            await page.wait_for_timeout(wait_ms)
            result = await page.evaluate(js_code)
            return result
        except Exception as exc:
            print(f"[!] Attempt {attempt} failed for {url}: {exc}")
            if attempt == MAX_RETRIES:
                raise
            print(f"[*] Waiting {RETRY_DELAY_SECONDS}s before retry ...")
            await asyncio.sleep(RETRY_DELAY_SECONDS)
        finally:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
            try:
                await pw.stop()
            except Exception:
                pass


async def _safe_goto(page: Page, url: str, timeout: int = 60_000) -> None:
    """Navigate to *url*, wait for network idle with domcontentloaded fallback."""
    try:
        await page.goto(url, wait_until="networkidle", timeout=timeout)
    except Exception:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
        except Exception as exc:
            print(f"[!] Failed to load {url}: {exc}")
            raise


# ---------------------------------------------------------------------------
# Step 1 -- Route index
# ---------------------------------------------------------------------------
ROUTE_INDEX_JS = """
() => {
    const links = [...document.querySelectorAll('a')];
    const routeLinks = links.filter(a => /\\/route-\\d+/.test(a.href || ''));
    const seen = new Set();
    const results = [];
    for (const a of routeLinks) {
        const href = a.href.replace(/\\/$/, '');
        if (seen.has(href)) continue;
        seen.add(href);
        const text = a.textContent.trim();
        if (!text) continue;
        results.push({ name: text, url: a.href });
    }
    return results;
}
"""


async def scrape_route_index() -> list[dict]:
    """Return list of {name, number, url} for every route."""
    routes = await scrape_single_url(ROUTES_URL, ROUTE_INDEX_JS)
    for route in routes:
        match = ROUTE_NUM_PATTERN.search(route["url"])
        route["number"] = match.group(1) if match else ""

    print(f"[+] Found {len(routes)} routes on index page.")
    for r in routes:
        print(f"    Route {r['number']:>2}: {r['name']}")
    return routes


# ---------------------------------------------------------------------------
# Step 2 -- Individual route page
# ---------------------------------------------------------------------------
ROUTE_DETAIL_JS = """() => {
    function textOf(el) { return el ? el.textContent.trim() : ''; }

    const h1 = document.querySelector('h1') || document.querySelector('.entry-title');
    const title = textOf(h1);

    const paragraphs = [...document.querySelectorAll(
        '.entry-content p, article p, .post-content p'
    )];
    const description = paragraphs
        .map(p => textOf(p)).filter(t => t.length > 10).slice(0, 3).join(' ');

    const scheduleBlocks = [];
    const allElements = [...document.querySelectorAll(
        '.section-title, .direction-title, table, h2, h3, h4, strong, b'
    )];

    let currentDay = 'weekday';
    let currentDirection = 'outbound';

    for (const el of allElements) {
        const txt = textOf(el);
        if (!txt) continue;
        if (/saturday|sunday|weekend/i.test(txt)) currentDay = 'saturday';
        if (/weekday|monday|mon[\\s-]fri/i.test(txt)) currentDay = 'weekday';
        if (/outbound|depart/i.test(txt)) currentDirection = 'outbound';
        if (/inbound|return|arrive/i.test(txt)) currentDirection = 'inbound';

        if (el.tagName === 'TABLE') {
            const rows = [...el.querySelectorAll('tr')];
            if (rows.length < 2) continue;
            const headers = [...rows[0].querySelectorAll('th, td')]
                .map(c => textOf(c)).filter(Boolean);
            const timeRows = rows.slice(1).map(row =>
                [...row.querySelectorAll('td')].map(c => textOf(c))
            ).filter(r => r.some(c => c));
            scheduleBlocks.push({
                day: currentDay, direction: currentDirection,
                headers, rows: timeRows
            });
        }
    }
    return { title, description, scheduleBlocks };
}"""


async def scrape_route_page(route_info: dict) -> dict:
    """Scrape a single route detail page and return structured data."""
    print(f"\n[*] Scraping Route {route_info['number']}: {route_info['url']}")
    data = await scrape_single_url(route_info["url"], ROUTE_DETAIL_JS)
    return build_route_record(route_info, data)


# ---------------------------------------------------------------------------
# Step 3 -- System map (geo data)
# ---------------------------------------------------------------------------
SYSTEM_MAP_JS = """() => {
    const result = {iframes:[], kml_urls:[], geojson_urls:[], map_data:null};
    for (const f of document.querySelectorAll('iframe'))
        if (f.src) result.iframes.push(f.src);
    const html = document.documentElement.outerHTML;
    result.kml_urls = [...new Set(html.match(/https?:[^"'\\s]+\\.kml/gi)||[])];
    result.geojson_urls = [...new Set(html.match(/https?:[^"'\\s]+\\.geojson/gi)||[])];
    if (window.L && window.L.map) result.map_data = 'leaflet_detected';
    if (window.google && window.google.maps) result.map_data = 'google_maps_detected';
    for (const s of document.querySelectorAll('script')) {
        if (/kml|geojson|coordinates|LatLng/i.test(s.textContent||''))
            result.map_data = (s.textContent||'').substring(0, 500);
        if (/maps\\.google|leaflet/i.test(s.src||''))
            result.iframes.push(s.src);
    }
    return result;
}"""


async def scrape_system_map() -> dict | None:
    """Attempt to find KML/GeoJSON/coordinates on the system map page."""
    print(f"\n[*] Scraping system map: {SYSTEM_MAP_URL}")
    try:
        geo_data = await scrape_single_url(SYSTEM_MAP_URL, SYSTEM_MAP_JS, wait_ms=5000)
        print(f"[+] System map: {json.dumps(geo_data, indent=2)[:500]}")
        return geo_data
    except Exception as exc:
        print(f"[!] Could not scrape system map: {exc}")
        return None


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------
async def main() -> None:
    route_list = await scrape_route_index()

    routes_data: list[dict] = []
    for route_info in route_list:
        try:
            record = await scrape_route_page(route_info)
            routes_data.append(record)
            tp_count = len(record["timepoints"])
            print(f"[+] Route {record['number']} OK ({tp_count} timepoints)")
        except Exception as exc:
            print(f"[!] Error on route {route_info.get('number')}: {exc}")
            routes_data.append(_error_record(route_info, exc))

    map_data = await scrape_system_map()
    _write_output(routes_data, map_data)


def _error_record(route_info: dict, exc: Exception) -> dict:
    """Return a stub record when scraping a route fails."""
    return {
        "id": f"route-{route_info.get('number', '?')}",
        "name": route_info.get("name", ""),
        "number": route_info.get("number", ""),
        "schedule": {"weekday": None, "saturday": None},
        "timepoints": [],
        "description": f"Scrape error: {exc}",
    }


def _write_output(routes_data: list[dict], map_data: dict | None) -> None:
    """Assemble and write the final JSON output."""
    output = {
        "routes": routes_data,
        "system_map": map_data,
        "metadata": {
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "source": "themtransit.com",
            "total_routes": len(routes_data),
        },
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"\n[+] Wrote {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size:,} bytes)")
    print(f"[+] Total routes: {len(routes_data)}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[!] Interrupted.")
        sys.exit(1)
