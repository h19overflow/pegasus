"""Unified webhook receiver for all Bright Data deliveries.

Receives POST requests from Bright Data when scrapes complete,
routes to the appropriate processor, and saves results.

On startup (with BRIGHTDATA_API_KEY set), automatically triggers all
scrape streams and repeats on a 15-minute interval. Set AUTO_SCRAPE=0
to disable.

Usage:
    pip install fastapi uvicorn
    source .env && uvicorn scripts.webhook_server:app --port 8787
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from backend.config import RAW_DIR
from backend.core.sse_broadcaster import (
    broadcast_event,
    create_client_queue,
    remove_client_queue,
    stream_events,
)
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


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Start background scraping on server boot if API key is available."""
    scraper_task = None
    auto_scrape = os.environ.get("AUTO_SCRAPE", "1") != "0"
    has_api_key = bool(os.environ.get("BRIGHTDATA_API_KEY"))

    if auto_scrape and has_api_key:
        from backend.core.scrape_scheduler import start_scheduled_scraping
        scraper_task = asyncio.create_task(start_scheduled_scraping())

    yield

    if scraper_task:
        scraper_task.cancel()


app = FastAPI(title="MontgomeryAI Webhook Receiver", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8081", "http://localhost:8082"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/stream")
async def sse_stream() -> StreamingResponse:
    """SSE endpoint — clients connect here for live data updates."""
    queue = create_client_queue()

    async def event_generator():
        try:
            async for chunk in stream_events(queue):
                yield chunk
        finally:
            remove_client_queue(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def save_raw_webhook(stream_type: str, data: list | dict) -> None:
    """Save raw webhook payload for debugging."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = RAW_DIR / f"webhook_{stream_type}_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@app.post("/webhook/jobs")
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


@app.post("/webhook/news")
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


@app.post("/webhook/housing")
async def webhook_housing(request: Request) -> JSONResponse:
    """Receive Zillow listing results from Bright Data."""
    raw_listings = await request.json()
    save_raw_webhook("housing", raw_listings)

    features = process_zillow_listings(raw_listings)
    save_housing_results(features)
    broadcast_event("housing", features)

    return JSONResponse({"ok": True, "listings": len(features)})


@app.get("/health")
async def health() -> JSONResponse:
    """Health check endpoint."""
    return JSONResponse({
        "status": "ok",
        "streams": ["jobs", "news", "housing", "benefits"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
