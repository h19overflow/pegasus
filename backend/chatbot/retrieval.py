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
from backend.chatbot.date_utils import parse_temporal_intent, filter_events_by_date

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
        s, h, c = _retrieve_services(entities, message)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.REPORT_ISSUE:
        context_parts.append(_build_report_context(entities, message))

    elif intent == CivicIntent.CITY_EVENTS:
        s, c = _retrieve_events(message)
        sources.extend(s); context_parts.append(c)

    elif intent == CivicIntent.TRAFFIC_DISRUPTION:
        s, c = _retrieve_traffic_info(message)
        sources.extend(s); context_parts.append(c)

    elif intent == CivicIntent.NEIGHBORHOOD_SUMMARY:
        s, h, c = _retrieve_neighborhood(entities)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.NEW_RESIDENT:
        s, h, c = _retrieve_new_resident(entities, message)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.JOB_LOSS_SUPPORT:
        s, h, c = _retrieve_job_loss_support(entities, message)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    elif intent == CivicIntent.TRENDING_ISSUES:
        s, c = _retrieve_trending_issues()
        sources.extend(s); context_parts.append(c)

    elif intent == CivicIntent.PUBLIC_SAFETY:
        s, c = _retrieve_public_safety(entities, message)
        sources.extend(s); context_parts.append(c)

    else:
        # General: try services + news
        s, h, c = _retrieve_services(entities, message)
        sources.extend(s); highlights.extend(h); context_parts.append(c)

    context_text = "\n".join(p for p in context_parts if p)
    return sources, highlights, context_text


# ── Service retrieval ────────────────────────────────────

def _retrieve_services(
    entities: ExtractedEntities, message: str,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Find matching government services. Handles compound queries."""
    services = _get_gov_services()
    lower = message.lower()

    # Detect compound queries (e.g. "free computer access to apply for jobs")
    # by checking multiple category matches
    from backend.chatbot.entities import detect_multi_categories
    multi_cats = detect_multi_categories(message)

    if len(multi_cats) > 1:
        # Compound query — search across all matched categories
        sources = _retrieve_services_multi(multi_cats)
        # Build context from sources
        context = ""
        if sources:
            lines = ["Relevant Montgomery services:"]
            for s in sources:
                lines.append(f"- {s.title}: {s.description[:120]}")
            context = "\n".join(lines)
        return sources, [], context

    # Single category — original logic
    query = (entities.service_category or message).lower()
    query_words = query.split()
    matches = []
    for s in services:
        text = f"{s.get('title', '')} {s.get('description', '')} {s.get('category', '')} {' '.join(s.get('tags', []))}".lower()
        if any(w in text for w in query_words):
            matches.append(s)
    matches = matches[:5]

    sources = [
        SourceItem(
            title=s.get("title", ""),
            description=s.get("description", ""),
            url=s.get("url"),
            category=s.get("category"),
        )
        for s in matches
    ]

    # If no matches found in gov_services but the category is a known map
    # category (data loaded from ArcGIS on the frontend), return synthetic
    # sources so the responder knows the data exists on the map.
    if not sources and entities.service_category:
        map_sources = _get_map_category_sources(entities.service_category, entities.neighborhood)
        if map_sources:
            sources = map_sources

    # Civic points for map highlights
    points = _get_civic_points()
    cat = entities.service_category or ""
    point_matches = [p for p in points if cat in (p.get("category", "") or "").lower()][:5]
    highlights = []
    for p in point_matches:
        coords = p.get("_coords")
        if coords and len(coords) >= 2:
            highlights.append(MapHighlight(
                lat=coords[1], lng=coords[0],
                label=p.get("name", p.get("Name", "")),
                category=p.get("category"),
            ))

    context = ""
    if matches:
        lines = ["Relevant Montgomery services:"]
        for s in matches:
            lines.append(f"- {s.get('title')}: {s.get('description', '')[:120]}")
            if s.get("phone"):
                lines.append(f"  Phone: {s['phone']}")
            if s.get("address"):
                lines.append(f"  Address: {s['address']}")
        context = "\n".join(lines)
    elif sources:
        # Context from synthetic map category sources
        lines = ["Montgomery city services (map data):"]
        for s in sources:
            lines.append(f"- {s.title}: {s.description}")
        context = "\n".join(lines)

    return sources, highlights, context


def _retrieve_services_multi(categories: list[str]) -> list[SourceItem]:
    """Retrieve services across multiple categories (for compound queries)."""
    services = _get_gov_services()
    results: list[SourceItem] = []
    for cat in categories:
        cat_matches = [
            s for s in services
            if cat in s.get("category", "").lower()
            or cat in s.get("title", "").lower()
            or cat in s.get("description", "").lower()
            or any(cat in t for t in s.get("tags", []))
        ][:2]
        for s in cat_matches:
            results.append(SourceItem(
                title=s.get("title", ""),
                description=s.get("description", ""),
                url=s.get("url"),
                category=s.get("category"),
            ))
    return results[:8]


# Categories that exist on the frontend map (loaded from ArcGIS) but not in
# gov_services.json. When the user asks about these, we return synthetic
# sources so the responder knows the data exists.
_MAP_CATEGORY_INFO: dict[str, dict[str, str]] = {
    "libraries": {
        "label": "Libraries",
        "description": "Public library branches with free computer access, WiFi, printing, and community programs",
        "note": "Montgomery City-County Public Library system",
    },
    "parks": {
        "label": "Parks & Recreation",
        "description": "City parks, playgrounds, trails, and recreation areas",
        "note": "Montgomery Parks & Recreation Department",
    },
    "safety": {
        "label": "Fire & Safety",
        "description": "Fire stations and emergency services across Montgomery",
        "note": "Montgomery Fire/Rescue Department",
    },
    "police": {
        "label": "Police Facilities",
        "description": "Police stations, precincts, and public safety offices",
        "note": "Montgomery Police Department",
    },
    "community": {
        "label": "Community Centers",
        "description": "Community centers offering programs, workshops, and resources",
        "note": "Montgomery community services",
    },
    "health": {
        "label": "Healthcare Facilities",
        "description": "Hospitals, clinics, and healthcare providers in Montgomery",
        "note": "Montgomery healthcare network",
    },
    "childcare": {
        "label": "Childcare Centers",
        "description": "Licensed daycare centers and preschool programs",
        "note": "Montgomery childcare providers",
    },
    "education": {
        "label": "Education Facilities",
        "description": "Schools, colleges, and training centers in Montgomery",
        "note": "Montgomery education system",
    },
}


def _get_map_category_sources(
    category: str, neighborhood: str | None = None,
) -> list[SourceItem]:
    """Return synthetic sources for categories that live on the frontend map."""
    info = _MAP_CATEGORY_INFO.get(category)
    if not info:
        return []

    location = f" near {neighborhood}" if neighborhood else " in Montgomery"
    return [
        SourceItem(
            title=f"{info['label']}{location}",
            description=info["description"],
            category=category,
        ),
        SourceItem(
            title=info["note"],
            description=f"Locations are shown on the interactive map. Browse the Services tab for details.",
            category=category,
        ),
    ]


# ── Report context ───────────────────────────────────────

def _build_report_context(entities: ExtractedEntities, message: str = "") -> str:
    """Build context for issue reporting, including trash schedule combo."""
    lower = message.lower()
    parts = ["The citizen wants to report a civic issue."]
    if entities.issue_type:
        parts.append(f"Issue type: {entities.issue_type}")
    if entities.address:
        parts.append(f"Location: {entities.address}")
    if entities.neighborhood:
        parts.append(f"Neighborhood: {entities.neighborhood}")

    # Trash schedule + report combo detection
    if "trash" in lower and ("schedule" in lower or "pickup" in lower or "collected" in lower):
        parts.append("COMBO_QUERY: trash_schedule_and_report")
        parts.append("Montgomery trash pickup: Mon/Thu (north), Tue/Fri (south), Wed (downtown).")
        parts.append("Missed pickup? Report via 311 or montgomeryalabama.gov/311.")

    parts.append(
        "Montgomery 311 handles: potholes, streetlights, trash, flooding, "
        "graffiti, sewer, noise, abandoned vehicles, sidewalks, traffic signals."
    )
    parts.append("Citizens can report online at montgomeryalabama.gov or call 311.")
    return "\n".join(parts)


# ── Event retrieval (date-aware) ─────────────────────────

def _retrieve_events(message: str) -> tuple[list[SourceItem], str]:
    """Find events with date-aware filtering and keyword matching."""
    from backend.predictive.mock_data import load_events

    lower = message.lower()
    mock_events = load_events()

    # Try date-based filtering first
    date_range = parse_temporal_intent(message)
    if date_range:
        date_filtered = filter_events_by_date(mock_events, date_range)
        date_label = date_range.label
    else:
        date_filtered = None
        date_label = ""

    # Apply keyword filtering
    keyword_filtered = _keyword_filter_events(lower, date_filtered or mock_events)

    # Combine: if we had a date filter AND keyword filter, use keyword results
    # If keyword filter returned nothing, fall back to date-only results
    if date_filtered and keyword_filtered:
        filtered = keyword_filtered
    elif date_filtered:
        filtered = date_filtered
    elif keyword_filtered:
        filtered = keyword_filtered
    else:
        filtered = mock_events[:6]

    if not filtered:
        filtered = mock_events[:5]

    sources = [
        SourceItem(
            title=e.get("name", ""),
            description=f"{e.get('date', '')} in {e.get('neighborhood', '')} — expected {e.get('expected_attendance', '?')} attendees",
            category=e.get("category"),
        )
        for e in filtered[:6]
    ]

    # Also check news for event articles
    news = _get_news()
    event_articles = [
        a for a in news
        if a.get("category") == "events"
        or "event" in a.get("title", "").lower()
        or "festival" in a.get("title", "").lower()
    ][:2]
    for a in event_articles:
        sources.append(SourceItem(
            title=a.get("title", ""),
            description=a.get("excerpt", "")[:100],
            url=a.get("sourceUrl"),
            category="news",
        ))

    context = f"Upcoming Montgomery events{' for ' + date_label if date_label else ''}:\n"
    for e in filtered[:6]:
        context += f"- {e['name']} — {e.get('date', 'TBD')}, {e.get('neighborhood', '')}, ~{e.get('expected_attendance', '?')} people\n"

    if not filtered:
        context += "(No events matched the requested time window.)\n"

    return sources, context


# ── Traffic reasoning ────────────────────────────────────

def _retrieve_traffic_info(message: str) -> tuple[list[SourceItem], str]:
    """Combine news + events + construction data for traffic reasoning."""
    from backend.predictive.mock_data import load_events

    news = _get_news()
    traffic_articles = [
        a for a in news
        if any(kw in a.get("title", "").lower() for kw in
               ["traffic", "road", "construction", "closure", "accident", "detour", "infrastructure"])
    ][:4]

    sources = [
        SourceItem(
            title=a.get("title", ""),
            description=a.get("excerpt", ""),
            url=a.get("sourceUrl"),
            category="traffic",
        )
        for a in traffic_articles
    ]

    # Check for large upcoming events that could cause traffic
    events = load_events()
    large_events = sorted(
        [e for e in events if e.get("expected_attendance", 0) >= 2000],
        key=lambda e: e.get("expected_attendance", 0),
        reverse=True,
    )[:3]

    for e in large_events:
        sources.append(SourceItem(
            title=f"Upcoming: {e['name']}",
            description=f"{e.get('date', '')} in {e.get('neighborhood', '')} — {e.get('expected_attendance', '?')} expected",
            category="event_traffic",
        ))

    # Build reasoning context
    context_parts = ["Montgomery traffic analysis:"]
    if traffic_articles:
        context_parts.append("Recent traffic-related news:")
        for a in traffic_articles:
            context_parts.append(f"  - {a.get('title', '')}")
    if large_events:
        context_parts.append("Large upcoming events (potential traffic impact):")
        for e in large_events:
            context_parts.append(f"  - {e['name']} ({e.get('date', '')}, {e.get('neighborhood', '')}, ~{e.get('expected_attendance', 0)} people)")
    context_parts.append("For real-time traffic, check ALDOT at algotraffic.com or call 311.")

    return sources, "\n".join(context_parts)


# ── Neighborhood summary ─────────────────────────────────

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


# ── New resident onboarding ──────────────────────────────

def _retrieve_new_resident(
    entities: ExtractedEntities, message: str,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Curated onboarding info for new Montgomery residents."""
    services = _get_gov_services()

    # Pick essential services across key categories
    essential_cats = ["utilities", "transportation", "health", "education", "community", "safety"]
    onboarding_services: list[SourceItem] = []
    for cat in essential_cats:
        cat_matches = [
            s for s in services
            if cat in s.get("category", "").lower()
            or cat in s.get("title", "").lower()
            or any(cat in t for t in s.get("tags", []))
        ][:1]
        for s in cat_matches:
            onboarding_services.append(SourceItem(
                title=s.get("title", ""),
                description=s.get("description", ""),
                url=s.get("url"),
                category=s.get("category"),
            ))

    # Map highlights for key civic points
    points = _get_civic_points()
    highlights = []
    for p in points[:6]:
        coords = p.get("_coords")
        if coords and len(coords) >= 2:
            highlights.append(MapHighlight(
                lat=coords[1], lng=coords[0],
                label=p.get("name", p.get("Name", "")),
                category=p.get("category"),
            ))

    context = (
        "New resident onboarding for Montgomery, AL:\n"
        "Key steps: 1) Set up utilities (Montgomery Water Works, Alabama Power)\n"
        "2) Register vehicle / get AL driver's license at DMV\n"
        "3) Register to vote at Montgomery County Board of Registrars\n"
        "4) Find your trash pickup schedule (Mon/Thu north, Tue/Fri south, Wed downtown)\n"
        "5) Explore city services, parks, and community centers\n"
        "6) Sign up for Montgomery 311 for civic issue reporting\n"
    )

    return onboarding_services, highlights, context


# ── Job loss support (multi-category) ────────────────────

def _retrieve_job_loss_support(
    entities: ExtractedEntities, message: str,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Grouped recommendations across employment, food, health, housing."""
    multi_sources = _retrieve_services_multi(
        ["employment", "food", "health", "housing", "legal"]
    )

    # Also get upcoming job fairs from events
    from backend.predictive.mock_data import load_events
    events = load_events()
    job_events = [e for e in events if e.get("category") == "employment"][:2]
    for e in job_events:
        multi_sources.append(SourceItem(
            title=e.get("name", ""),
            description=f"{e.get('date', '')} in {e.get('neighborhood', '')}",
            category="employment_event",
        ))

    context = (
        "Job loss support resources in Montgomery:\n"
        "EMPLOYMENT: Alabama Career Center (334-286-1746), WIOA training programs\n"
        "FOOD: Montgomery Area Food Bank, SNAP benefits via DHR\n"
        "HEALTH: Medicaid enrollment at Montgomery County DHR, community health clinics\n"
        "HOUSING: Emergency rental assistance, Section 8 Housing Authority\n"
        "LEGAL: Legal Services Alabama for employment disputes\n"
        "Alabama unemployment benefits: apply at labor.alabama.gov\n"
    )

    return multi_sources, [], context


# ── Trending issues ──────────────────────────────────────

def _retrieve_trending_issues() -> tuple[list[SourceItem], str]:
    """Pull trend data from predictive engine for chat responses."""
    try:
        from backend.predictive.trend_detector import detect_trends
        trends = detect_trends()
        sources = [
            SourceItem(
                title=f"{t.category.replace('_', ' ').title()} — {t.trend_direction}",
                description=f"{t.current_volume} reports (growth: {t.growth_rate:+.0%}). Top areas: {', '.join(t.top_neighborhoods[:2])}",
                category="trend",
            )
            for t in trends[:5]
        ]
        context = "Current civic trends in Montgomery:\n"
        for t in trends[:5]:
            context += f"- {t.category.replace('_', ' ').title()}: {t.current_volume} reports, {t.trend_direction} ({t.growth_rate:+.0%})\n"
            context += f"  Top areas: {', '.join(t.top_neighborhoods[:3])}\n"
        return sources, context
    except Exception as exc:
        logger.warning("Failed to load trends: %s", exc)
        return [], "Trend data temporarily unavailable."


# ── Event keyword filter helper ──────────────────────────

def _keyword_filter_events(lower: str, events: list[dict]) -> list[dict]:
    """Apply keyword-based category filtering to an event list."""
    if "free" in lower or "community" in lower:
        result = [e for e in events if e.get("category") in ("community", "civic")]
    elif "family" in lower or "kid" in lower or "child" in lower:
        result = [e for e in events if e.get("category") in ("community", "sports", "festival")]
    elif "volunteer" in lower:
        result = [e for e in events if e.get("category") in ("community", "civic")]
    elif "music" in lower or "art" in lower or "concert" in lower:
        result = [e for e in events if e.get("category") in ("arts", "festival")]
    elif "job" in lower or "career" in lower:
        result = [e for e in events if e.get("category") == "employment"]
    elif "food" in lower or "market" in lower:
        result = [e for e in events if e.get("category") in ("food", "market")]
    else:
        return []  # no keyword filter applied
    return result


# ── Public safety retrieval ──────────────────────────────

def _retrieve_public_safety(
    entities: ExtractedEntities, message: str,
) -> tuple[list[SourceItem], str]:
    """Retrieve context for public safety / police activity queries."""
    from backend.predictive.mock_data import load_events

    news = _get_news()
    lower = message.lower()

    # Search news for safety-related articles
    safety_keywords = ["police", "crime", "arrest", "shooting", "incident",
                       "investigation", "emergency", "fire", "accident", "safety"]
    safety_articles = [
        a for a in news
        if any(kw in a.get("title", "").lower() for kw in safety_keywords)
        or any(kw in a.get("excerpt", "").lower() for kw in safety_keywords)
    ][:4]

    sources = [
        SourceItem(
            title=a.get("title", ""),
            description=a.get("excerpt", "")[:120],
            url=a.get("sourceUrl"),
            category="public_safety",
        )
        for a in safety_articles
    ]

    # Check for large events near the mentioned area that could explain police presence
    events = load_events()
    hood = entities.neighborhood or ""
    if hood:
        area_events = [e for e in events
                       if hood.lower() in e.get("neighborhood", "").lower()
                       and e.get("expected_attendance", 0) >= 500]
    else:
        area_events = [e for e in events if e.get("expected_attendance", 0) >= 2000]
    area_events = area_events[:3]

    for e in area_events:
        sources.append(SourceItem(
            title=f"Nearby event: {e['name']}",
            description=f"{e.get('date', '')} in {e.get('neighborhood', '')} — {e.get('expected_attendance', '?')} expected",
            category="event_safety",
        ))

    # Build reasoning context
    context_parts = ["Public safety analysis for Montgomery:"]
    if safety_articles:
        context_parts.append("Recent safety-related news:")
        for a in safety_articles:
            context_parts.append(f"  - {a.get('title', '')}")
    if area_events:
        context_parts.append("Large events nearby (may explain increased police presence):")
        for e in area_events:
            context_parts.append(f"  - {e['name']} ({e.get('date', '')}, ~{e.get('expected_attendance', 0)} people)")
    context_parts.append("For emergencies, call 911. For non-emergencies, call Montgomery PD at 334-625-2831.")

    return sources, "\n".join(context_parts)
