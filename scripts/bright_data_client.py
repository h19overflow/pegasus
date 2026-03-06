"""Bright Data API client using the official SDK.

Wraps brightdata-sdk (SyncBrightDataClient) with the same function
signatures used by trigger scripts and the scrape scheduler.

- Page fetching: crawl dataset (replaces Web Unlocker — no zone needed)
- SERP API: SDK normalized search results via serp_api1 zone
- Dataset trigger/poll: SDK's DatasetAPIClient for trigger → poll → fetch
"""

import logging
import time
from typing import Any

from brightdata import SyncBrightDataClient
from brightdata.scrapers.api_client import DatasetAPIClient

from scripts.config import get_api_token, SERP_ZONE, DATASETS

logger = logging.getLogger("bright_data_client")


def _make_client(**overrides) -> SyncBrightDataClient:
    """Create a SyncBrightDataClient with existing zones (no auto-create)."""
    defaults = {
        "token": get_api_token(),
        "auto_create_zones": False,
        "serp_zone": SERP_ZONE,
    }
    defaults.update(overrides)
    return SyncBrightDataClient(**defaults)


# ---------------------------------------------------------------------------
# Web Scraper API (trigger → poll → fetch via SDK DatasetAPIClient)
# ---------------------------------------------------------------------------

def trigger_and_collect(
    dataset_id: str,
    payload: list[dict],
    params: dict | None = None,
    max_wait: int = 600,
    interval: int = 15,
) -> list[dict]:
    """Trigger a scraper, poll until ready, return results.

    Combines trigger + poll + download into a single call.
    Uses SDK's DatasetAPIClient for typed HTTP handling.
    """
    with _make_client() as client:
        api = DatasetAPIClient(client._async_client.engine)
        snapshot_id = _trigger_dataset(client, api, dataset_id, payload, params)
        if not snapshot_id:
            return []
        return _poll_and_fetch(client, api, snapshot_id, max_wait, interval)


def _trigger_dataset(
    client: SyncBrightDataClient,
    api: DatasetAPIClient,
    dataset_id: str,
    payload: list[dict],
    params: dict | None,
) -> str | None:
    """Trigger a dataset collection. Returns snapshot_id or None."""
    try:
        snapshot_id = client._run(
            api.trigger(payload=payload, dataset_id=dataset_id, extra_params=params)
        )
        logger.info("Triggered snapshot: %s", snapshot_id)
        return snapshot_id
    except Exception as e:
        logger.error("Trigger failed: %s", e)
        return None


def _poll_and_fetch(
    client: SyncBrightDataClient,
    api: DatasetAPIClient,
    snapshot_id: str,
    max_wait: int,
    interval: int,
) -> list[dict]:
    """Poll snapshot status, then fetch results when ready."""
    elapsed = 0
    while elapsed < max_wait:
        try:
            status = client._run(api.get_status(snapshot_id))
        except Exception as e:
            logger.warning("[%ds] Poll error: %s", elapsed, e)
            time.sleep(interval)
            elapsed += interval
            continue

        logger.info("[%ds] %s", elapsed, status)

        if status == "ready":
            return _fetch_snapshot(client, api, snapshot_id)
        if status == "failed":
            logger.error("Snapshot %s FAILED", snapshot_id)
            return []

        time.sleep(interval)
        elapsed += interval

    logger.error("Timed out after %ds for %s", max_wait, snapshot_id)
    return []


def _fetch_snapshot(
    client: SyncBrightDataClient,
    api: DatasetAPIClient,
    snapshot_id: str,
) -> list[dict]:
    """Download completed snapshot results."""
    try:
        records: Any = client._run(api.fetch_result(snapshot_id, format="json"))
        if isinstance(records, list):
            return records
        return records.get("data", [])
    except Exception as e:
        logger.error("Download failed: %s", e)
        return []


# Backward-compatible wrappers for trigger scripts (fire-and-forget mode)

def trigger_scraper(
    dataset_id: str,
    payload: list[dict],
    params: dict | None = None,
    webhook_url: str | None = None,
) -> str | None:
    """Trigger a Web Scraper API dataset. Returns snapshot_id or None.

    Kept for callers that need fire-and-forget with webhook delivery.
    For poll mode, prefer trigger_and_collect().
    """
    with _make_client() as client:
        api = DatasetAPIClient(client._async_client.engine)
        extra = dict(params) if params else {}
        if webhook_url:
            extra["notify"] = webhook_url
        return _trigger_dataset(client, api, dataset_id, payload, extra)


def poll_snapshot(
    snapshot_id: str,
    max_wait: int = 600,
    interval: int = 15,
) -> list[dict]:
    """Poll until snapshot is ready, then download results."""
    with _make_client() as client:
        api = DatasetAPIClient(client._async_client.engine)
        return _poll_and_fetch(client, api, snapshot_id, max_wait, interval)


# ---------------------------------------------------------------------------
# Page fetcher (uses crawl dataset — no Web Unlocker zone needed)
# ---------------------------------------------------------------------------

def fetch_with_unlocker(
    url: str,
    zone: str | None = None,
    as_markdown: bool = True,
) -> str | None:
    """Fetch a URL via the crawl dataset. Returns markdown/HTML or None.

    Uses the crawl dataset which returns markdown by default,
    avoiding the need for a Web Unlocker zone.
    """
    results = trigger_and_collect(
        dataset_id=DATASETS["crawl"],
        payload=[{"url": url}],
        max_wait=120,
        interval=5,
    )
    if not results:
        return None

    page = results[0]
    if as_markdown:
        return page.get("markdown") or page.get("html2text") or page.get("page_html")
    return page.get("page_html") or page.get("markdown")


# ---------------------------------------------------------------------------
# SERP API
# ---------------------------------------------------------------------------

def serp_search(
    query: str,
    zone: str | None = None,
    search_type: str = "nws",
) -> dict | None:
    """Run a Google News search. Returns parsed results or None.

    Returns {"results": [...]} so parse_news_results() picks it up
    via its body.get("results", []) fallback path.
    """
    try:
        overrides = {"serp_zone": zone} if zone else {}
        with _make_client(**overrides) as client:
            result = client.search.google(
                query=query,
                location="Montgomery, AL",
                num_results=20,
            )
            if result.data:
                return {"results": result.data, "total": result.total_found}
    except Exception as e:
        logger.error("SERP failed for '%s': %s", query, e)
    return None
