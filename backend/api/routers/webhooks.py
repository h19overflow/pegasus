"""Webhook endpoints for Bright Data scrape deliveries."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import RAW_DIR
from backend.core.sse_broadcaster import broadcast_event
from backend.processors.process_jobs import (
    detect_source, process_jobs, build_geojson_feature, save_job_results,
)
from backend.processors.process_news import (
    parse_news_results, enrich_article, deduplicate_articles,
    load_existing_articles, save_news_articles,
)
from backend.processors.process_housing import (
    process_zillow_listings, save_housing_results,
)

router = APIRouter(prefix="/webhook", tags=["webhooks"])


def save_raw_webhook(stream_type: str, data: list | dict) -> None:
    """Save raw webhook payload for debugging."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = RAW_DIR / f"webhook_{stream_type}_{timestamp}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@router.post("/jobs")
async def webhook_jobs(request: Request) -> JSONResponse:
    """Receive job scraper results from Bright Data."""
    raw_jobs = await request.json()
    save_raw_webhook("jobs", raw_jobs)

    source = detect_source(raw_jobs)
    valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
    processed = process_jobs(valid, source)

    features = [build_geojson_feature(j) for j in processed]
    features = [f for f in features if f is not None]
    save_job_results(features)
    broadcast_event("jobs", features)

    return JSONResponse({"ok": True, "processed": len(features)})


@router.post("/news")
async def webhook_news(request: Request) -> JSONResponse:
    """Receive SERP news results from Bright Data."""
    raw_data = await request.json()
    save_raw_webhook("news", raw_data)

    articles = parse_news_results(raw_data, category="general")
    for article in articles:
        enrich_article(article)

    existing = load_existing_articles()
    merged = articles + existing
    unique = deduplicate_articles(merged)
    save_news_articles(unique)
    broadcast_event("news", articles)

    return JSONResponse({"ok": True, "articles": len(articles)})


@router.post("/housing")
async def webhook_housing(request: Request) -> JSONResponse:
    """Receive Zillow listing results from Bright Data."""
    raw_listings = await request.json()
    save_raw_webhook("housing", raw_listings)

    features = process_zillow_listings(raw_listings)
    save_housing_results(features)
    broadcast_event("housing", features)

    return JSONResponse({"ok": True, "listings": len(features)})
