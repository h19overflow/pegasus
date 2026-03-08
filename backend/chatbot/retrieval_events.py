"""Event, traffic, and new-resident retrieval for the civic chatbot."""

from __future__ import annotations

import logging

from backend.models import SourceItem, MapHighlight, ExtractedEntities
from backend.chatbot.date_utils import parse_temporal_intent, filter_events_by_date

logger = logging.getLogger(__name__)


def retrieve_events(
    message: str, get_news: object
) -> tuple[list[SourceItem], str]:
    """Find events with date-aware filtering and keyword matching."""
    from backend.predictive.mock_data import load_events

    lower = message.lower()
    mock_events = load_events()

    date_range = parse_temporal_intent(message)
    if date_range:
        date_filtered = filter_events_by_date(mock_events, date_range)
        date_label = date_range.label
    else:
        date_filtered = None
        date_label = ""

    keyword_filtered = _keyword_filter_events(lower, date_filtered or mock_events)
    filtered = _resolve_event_filter(date_filtered, keyword_filtered, mock_events)

    sources = _build_event_sources(filtered, get_news)
    context = _build_event_context(filtered, date_label)
    return sources, context


def _resolve_event_filter(
    date_filtered: list[dict] | None,
    keyword_filtered: list[dict],
    all_events: list[dict],
) -> list[dict]:
    """Resolve the best event list from date and keyword filters."""
    if date_filtered and keyword_filtered:
        return keyword_filtered
    elif date_filtered:
        return date_filtered
    elif keyword_filtered:
        return keyword_filtered
    return all_events[:6]


def _build_event_sources(filtered: list[dict], get_news: object) -> list[SourceItem]:
    """Build source items from filtered events and related news articles."""
    sources = [
        SourceItem(
            title=e.get("name", ""),
            description=(
                f"{e.get('date', '')} in {e.get('neighborhood', '')} "
                f"— expected {e.get('expected_attendance', '?')} attendees"
            ),
            category=e.get("category"),
        )
        for e in filtered[:6]
    ]

    news = get_news()
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
    return sources


def _build_event_context(filtered: list[dict], date_label: str) -> str:
    """Build context text for upcoming events."""
    header = f"Upcoming Montgomery events{' for ' + date_label if date_label else ''}:\n"
    lines = [header]
    for e in filtered[:6]:
        lines.append(
            f"- {e['name']} — {e.get('date', 'TBD')}, "
            f"{e.get('neighborhood', '')}, ~{e.get('expected_attendance', '?')} people"
        )
    if not filtered:
        lines.append("(No events matched the requested time window.)")
    return "\n".join(lines)


def _keyword_filter_events(lower: str, events: list[dict]) -> list[dict]:
    """Apply keyword-based category filtering to an event list."""
    if "free" in lower or "community" in lower:
        return [e for e in events if e.get("category") in ("community", "civic")]
    elif "family" in lower or "kid" in lower or "child" in lower:
        return [e for e in events if e.get("category") in ("community", "sports", "festival")]
    elif "volunteer" in lower:
        return [e for e in events if e.get("category") in ("community", "civic")]
    elif "music" in lower or "art" in lower or "concert" in lower:
        return [e for e in events if e.get("category") in ("arts", "festival")]
    elif "job" in lower or "career" in lower:
        return [e for e in events if e.get("category") == "employment"]
    elif "food" in lower or "market" in lower:
        return [e for e in events if e.get("category") in ("food", "market")]
    return []


def retrieve_traffic_info(
    message: str, get_news: object
) -> tuple[list[SourceItem], str]:
    """Combine news + events + construction data for traffic reasoning."""
    from backend.predictive.mock_data import load_events

    news = get_news()
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

    events = load_events()
    large_events = sorted(
        [e for e in events if e.get("expected_attendance", 0) >= 2000],
        key=lambda e: e.get("expected_attendance", 0),
        reverse=True,
    )[:3]

    for e in large_events:
        sources.append(SourceItem(
            title=f"Upcoming: {e['name']}",
            description=(
                f"{e.get('date', '')} in {e.get('neighborhood', '')} "
                f"— {e.get('expected_attendance', '?')} expected"
            ),
            category="event_traffic",
        ))

    context = _build_traffic_context(traffic_articles, large_events)
    return sources, context


def _build_traffic_context(
    traffic_articles: list[dict], large_events: list[dict]
) -> str:
    """Build reasoning context for traffic queries."""
    context_parts = ["Montgomery traffic analysis:"]
    if traffic_articles:
        context_parts.append("Recent traffic-related news:")
        for a in traffic_articles:
            context_parts.append(f"  - {a.get('title', '')}")
    if large_events:
        context_parts.append("Large upcoming events (potential traffic impact):")
        for e in large_events:
            context_parts.append(
                f"  - {e['name']} ({e.get('date', '')}, "
                f"{e.get('neighborhood', '')}, ~{e.get('expected_attendance', 0)} people)"
            )
    context_parts.append("For real-time traffic, check ALDOT at algotraffic.com or call 311.")
    return "\n".join(context_parts)


def retrieve_new_resident(
    entities: ExtractedEntities,
    message: str,
    get_gov_services: object,
    get_civic_points: object,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Curated onboarding info for new Montgomery residents."""
    services = get_gov_services()
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

    points = get_civic_points()
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
