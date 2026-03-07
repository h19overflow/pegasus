"""Context retrieval for the civic chatbot.

Loads gov_services.json, civic_services.geojson, news_feed.json,
and mock event data. Supports date-filtered events, multi-category
service search, traffic reasoning, and trend data retrieval.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from backend.config import PUBLIC_DATA
from backend.models import CivicIntent, ExtractedEntities, SourceItem, MapHighlight
from backend.chatbot.retrieval_services import (
    retrieve_services as _retrieve_services,
    build_report_context as _build_report_context,
)
from backend.chatbot.retrieval_events import (
    retrieve_events as _retrieve_events,
    retrieve_traffic_info as _retrieve_traffic_info,
    retrieve_new_resident as _retrieve_new_resident,
)
from backend.chatbot.retrieval_safety import (
    retrieve_public_safety as _retrieve_public_safety,
    retrieve_trending_issues as _retrieve_trending_issues,
    retrieve_job_loss_support as _retrieve_job_loss_support,
)

logger = logging.getLogger(__name__)

# ── Data loaders (cached) ────────────────────────────────

_gov_services: list[dict] | None = None
_civic_points: list[dict] | None = None
_news_articles: list[dict] | None = None


def _load_json(path: Path) -> Any:
    if not path.exists():
        logger.warning("Data file not found: %s", path)
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _get_gov_services() -> list[dict]:
    global _gov_services
    if _gov_services is None:
        data = _load_json(PUBLIC_DATA / "gov_services.json")
        _gov_services = data.get("services", []) if isinstance(data, dict) else []
    return _gov_services


def _get_civic_points() -> list[dict]:
    global _civic_points
    if _civic_points is None:
        data = _load_json(PUBLIC_DATA / "civic_services.geojson")
        if isinstance(data, dict) and "features" in data:
            _civic_points = [
                {**f.get("properties", {}), "_coords": f.get("geometry", {}).get("coordinates")}
                for f in data["features"]
            ]
        else:
            _civic_points = []
    return _civic_points


def _get_news() -> list[dict]:
    global _news_articles
    if _news_articles is None:
        data = _load_json(PUBLIC_DATA / "news_feed.json")
        if isinstance(data, dict):
            _news_articles = data.get("articles", [])
        elif isinstance(data, list):
            _news_articles = data
        else:
            _news_articles = []
    return _news_articles


# ── Main retrieval dispatcher ────────────────────────────

def retrieve_context(
    intent: CivicIntent,
    entities: ExtractedEntities,
    message: str,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Retrieve relevant context based on intent and entities.

    Returns (source_items, map_highlights, context_text_for_llm).
    """
    sources: list[SourceItem] = []
    highlights: list[MapHighlight] = []
    context_parts: list[str] = []

    if intent == CivicIntent.FIND_SERVICE:
        s, h, c = _retrieve_services(entities, message, _get_gov_services, _get_civic_points)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.REPORT_ISSUE:
        context_parts.append(_build_report_context(entities, message))

    elif intent == CivicIntent.CITY_EVENTS:
        s, c = _retrieve_events(message, _get_news)
        sources.extend(s); context_parts.append(c)

    elif intent == CivicIntent.TRAFFIC_DISRUPTION:
        s, c = _retrieve_traffic_info(message, _get_news)
        sources.extend(s); context_parts.append(c)

    elif intent == CivicIntent.NEIGHBORHOOD_SUMMARY:
        s, h, c = _retrieve_neighborhood(entities)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.NEW_RESIDENT:
        s, h, c = _retrieve_new_resident(entities, message, _get_gov_services, _get_civic_points)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.JOB_LOSS_SUPPORT:
        s, h, c = _retrieve_job_loss_support(entities, message, _get_gov_services)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.TRENDING_ISSUES:
        s, c = _retrieve_trending_issues()
        sources.extend(s); context_parts.append(c)

    elif intent == CivicIntent.PUBLIC_SAFETY:
        s, c = _retrieve_public_safety(entities, message, _get_news)
        sources.extend(s); context_parts.append(c)

    else:
        s, h, c = _retrieve_services(entities, message, _get_gov_services, _get_civic_points)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    context_text = "\n".join(p for p in context_parts if p)
    return sources, highlights, context_text


# ── Neighborhood summary (kept local — uses only cached civic points) ───────

def _retrieve_neighborhood(
    entities: ExtractedEntities,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Build neighborhood summary context."""
    hood = entities.neighborhood or "Montgomery"
    points = _get_civic_points()
    nearby = [
        p for p in points
        if hood.lower() in (p.get("name", "") + p.get("address", "")).lower()
    ][:8]

    highlights = []
    for p in nearby:
        coords = p.get("_coords")
        if coords and len(coords) >= 2:
            highlights.append(MapHighlight(
                lat=coords[1], lng=coords[0],
                label=p.get("name", p.get("Name", "")),
                category=p.get("category"),
            ))

    context = f"Neighborhood summary for {hood}:\n"
    if nearby:
        cats = set(p.get("category", "unknown") for p in nearby)
        context += f"Nearby service categories: {', '.join(cats)}\n"
        context += f"Found {len(nearby)} civic service points in this area."
    else:
        context += "Limited data available for this specific area."

    return [], highlights, context
