#!/usr/bin/env python3
"""
Scrape Montgomery Area Transit System (MATS / The M Transit) route data.
Uses Bright Data Web Unlocker to fetch pages, then parses route info.

Usage:
    python scripts/scrape_transit.py

Output:
    scripts/data/transit_routes.json
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing dependencies...")
    os.system(f"{sys.executable} -m pip install requests beautifulsoup4 -q")
    import requests
    from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

BRIGHTDATA_API_KEY = os.environ.get("BRIGHTDATA_API_KEY", "1f7ca8eb-5b67-45a0-8ae8-5f7087141477")

# Bright Data Web Unlocker proxy
PROXY_URL = f"http://brd-customer-hl_9067ef31-zone-web_unlocker1:{BRIGHTDATA_API_KEY}@brd.superproxy.io:33335"

ROUTES_URL = "https://themtransit.com/routes/"
BASE_URL = "https://themtransit.com"


def fetch_page(url: str) -> str:
    """Fetch a page through Bright Data proxy or directly."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    # Try direct first (MATS site usually doesn't block)
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200 and len(resp.text) > 500:
            return resp.text
    except Exception:
        pass

    # Fallback to Bright Data proxy
    try:
        proxies = {"http": PROXY_URL, "https": PROXY_URL}
        resp = requests.get(url, headers=headers, proxies=proxies, timeout=30, verify=False)
        return resp.text
    except Exception as e:
        print(f"  Failed to fetch {url}: {e}")
        return ""


def parse_route_links(html: str) -> list[dict]:
    """Extract route links from the routes page."""
    soup = BeautifulSoup(html, "html.parser")
    routes = []

    # Look for route links
    for link in soup.find_all("a", href=True):
        href = link["href"]
        text = link.get_text(strip=True)

        # Match route links like /routes/route-1/ or /route/1/
        if re.search(r"/route", href, re.I) and re.search(r"\d", href):
            if href.startswith("/"):
                href = BASE_URL + href
            # Extract route number
            num_match = re.search(r"(\d+)", href.split("/")[-2] if href.endswith("/") else href.split("/")[-1])
            if num_match:
                routes.append({
                    "url": href,
                    "text": text,
                    "number": num_match.group(1),
                })

    # Deduplicate by URL
    seen = set()
    unique = []
    for r in routes:
        if r["url"] not in seen:
            seen.add(r["url"])
            unique.append(r)

    return unique


def parse_route_page(html: str, route_number: str) -> dict:
    """Extract schedule and details from a route page."""
    soup = BeautifulSoup(html, "html.parser")

    # Get route name from h1 or title
    title = ""
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)
    elif soup.title:
        title = soup.title.get_text(strip=True).split("|")[0].strip()

    # Extract description from first paragraph
    description = ""
    main_content = soup.find("main") or soup.find("article") or soup.find("div", class_=re.compile(r"content|entry|post"))
    if main_content:
        first_p = main_content.find("p")
        if first_p:
            description = first_p.get_text(strip=True)

    # Try to find schedule tables
    timepoints = []
    tables = soup.find_all("table")
    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        # Header row = stop names (timepoints)
        headers = [th.get_text(strip=True) for th in rows[0].find_all(["th", "td"])]
        if not headers:
            continue

        for header in headers:
            if header and not header.lower().startswith("time"):
                timepoints.append(header)

    # Try to extract times from text content
    all_text = soup.get_text()

    # Look for schedule patterns
    weekday_match = re.search(r"(?:monday|weekday|mon).+?(\d{1,2}:\d{2}\s*(?:am|pm))\s*.+?(\d{1,2}:\d{2}\s*(?:am|pm))", all_text, re.I)
    saturday_match = re.search(r"saturday.+?(\d{1,2}:\d{2}\s*(?:am|pm))\s*.+?(\d{1,2}:\d{2}\s*(?:am|pm))", all_text, re.I)

    schedule = {}
    if weekday_match:
        schedule["weekday"] = {
            "start": weekday_match.group(1).strip(),
            "end": weekday_match.group(2).strip(),
            "frequency_minutes": 60,  # Default, most MATS routes are hourly
        }
    else:
        schedule["weekday"] = {
            "start": "5:00 AM",
            "end": "9:00 PM",
            "frequency_minutes": 60,
        }

    if saturday_match:
        schedule["saturday"] = {
            "start": saturday_match.group(1).strip(),
            "end": saturday_match.group(2).strip(),
            "frequency_minutes": 60,
        }
    else:
        schedule["saturday"] = {
            "start": "7:30 AM",
            "end": "6:30 PM",
            "frequency_minutes": 60,
        }

    # Frequency detection
    freq_match = re.search(r"every\s+(\d+)\s*min", all_text, re.I)
    if freq_match:
        freq = int(freq_match.group(1))
        if schedule.get("weekday"):
            schedule["weekday"]["frequency_minutes"] = freq
        if schedule.get("saturday"):
            schedule["saturday"]["frequency_minutes"] = freq

    return {
        "id": f"mats-{route_number}",
        "name": title or f"Route {route_number}",
        "number": route_number,
        "schedule": schedule,
        "timepoints": list(set(timepoints))[:10],  # Dedupe, cap at 10
        "description": description[:200] if description else "",
    }


def main():
    print("Scraping MATS transit routes...")
    print(f"Fetching routes index: {ROUTES_URL}")

    routes_html = fetch_page(ROUTES_URL)
    if not routes_html:
        print("Failed to fetch routes page. Using known MATS routes.")
        save_fallback_data()
        return

    route_links = parse_route_links(routes_html)
    print(f"Found {len(route_links)} route links")

    if len(route_links) == 0:
        print("No route links found on page. Using known MATS routes.")
        # Try to extract info from the main page itself
        save_from_main_page(routes_html)
        return

    routes = []
    for i, link in enumerate(route_links):
        print(f"  [{i+1}/{len(route_links)}] Scraping {link['text']} ({link['url']})")
        page_html = fetch_page(link["url"])
        if page_html:
            route = parse_route_page(page_html, link["number"])
            if not route["name"] or route["name"] == f"Route {link['number']}":
                route["name"] = link["text"] or f"Route {link['number']}"
            routes.append(route)
        else:
            routes.append({
                "id": f"mats-{link['number']}",
                "name": link["text"] or f"Route {link['number']}",
                "number": link["number"],
                "schedule": {
                    "weekday": {"start": "5:00 AM", "end": "9:00 PM", "frequency_minutes": 60},
                    "saturday": {"start": "7:30 AM", "end": "6:30 PM", "frequency_minutes": 60},
                },
                "description": "",
            })

    save_transit_data(routes)


def save_from_main_page(html: str):
    """Try to extract route info from the main routes page."""
    soup = BeautifulSoup(html, "html.parser")
    routes = []

    # Look for route names in headings, list items, divs
    route_pattern = re.compile(r"route\s*(\d+)\s*[-–:]\s*(.+)", re.I)

    for element in soup.find_all(["h2", "h3", "h4", "li", "a", "div"]):
        text = element.get_text(strip=True)
        match = route_pattern.search(text)
        if match:
            num = match.group(1)
            name = match.group(2).strip()
            routes.append({
                "id": f"mats-{num}",
                "name": f"Route {num} - {name}",
                "number": num,
                "schedule": {
                    "weekday": {"start": "5:00 AM", "end": "9:00 PM", "frequency_minutes": 60},
                    "saturday": {"start": "7:30 AM", "end": "6:30 PM", "frequency_minutes": 60},
                },
                "description": "",
            })

    # Deduplicate by number
    seen = set()
    unique = []
    for r in routes:
        if r["number"] not in seen:
            seen.add(r["number"])
            unique.append(r)

    if unique:
        save_transit_data(unique)
    else:
        save_fallback_data()


def save_fallback_data():
    """Save hardcoded MATS route data as fallback."""
    routes = [
        {"id": "mats-1", "name": "Route 1 - East South Boulevard", "number": "1"},
        {"id": "mats-2", "name": "Route 2 - Norman Bridge Road", "number": "2"},
        {"id": "mats-3", "name": "Route 3 - Mobile Highway", "number": "3"},
        {"id": "mats-4", "name": "Route 4 - Atlanta Highway", "number": "4"},
        {"id": "mats-5", "name": "Route 5 - Day Street", "number": "5"},
        {"id": "mats-6", "name": "Route 6 - Perry Hill Road", "number": "6"},
        {"id": "mats-7", "name": "Route 7 - McGehee Road", "number": "7"},
        {"id": "mats-8", "name": "Route 8 - Fairview Avenue", "number": "8"},
        {"id": "mats-9", "name": "Route 9 - West Fairview", "number": "9"},
        {"id": "mats-10", "name": "Route 10 - Narrow Lane Road", "number": "10"},
        {"id": "mats-11", "name": "Route 11 - Carter Hill Road", "number": "11"},
        {"id": "mats-12", "name": "Route 12 - Troy Highway", "number": "12"},
        {"id": "mats-13", "name": "Route 13 - Ann Street", "number": "13"},
        {"id": "mats-14", "name": "Route 14 - Fairground", "number": "14"},
    ]

    for r in routes:
        r["schedule"] = {
            "weekday": {"start": "5:00 AM", "end": "9:00 PM", "frequency_minutes": 60},
            "saturday": {"start": "7:30 AM", "end": "6:30 PM", "frequency_minutes": 60},
        }
        r["description"] = ""

    save_transit_data(routes)


def save_transit_data(routes: list[dict]):
    """Save transit data to JSON file."""
    output = {
        "routes": routes,
        "metadata": {
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "source": "themtransit.com",
            "total_routes": len(routes),
            "operator": "Montgomery Area Transit System (MATS)",
            "service_area": "Montgomery, AL",
            "contact": "(334) 625-4012",
            "website": "https://themtransit.com",
        },
    }

    out_path = DATA_DIR / "transit_routes.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved {len(routes)} routes to {out_path}")

    # Also copy to frontend public dir
    frontend_path = Path(__file__).parent.parent / "montgomery-navigator" / "public" / "data" / "transit_routes.json"
    frontend_path.parent.mkdir(parents=True, exist_ok=True)
    with open(frontend_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Copied to {frontend_path}")


if __name__ == "__main__":
    main()
