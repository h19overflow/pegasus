"""Safety, trending, and job-loss retrieval for the civic chatbot."""

from __future__ import annotations

import logging

from backend.models import SourceItem, ExtractedEntities

logger = logging.getLogger(__name__)


def retrieve_public_safety(
    entities: ExtractedEntities,
    message: str,
    get_news: object,
) -> tuple[list[SourceItem], str]:
    """Retrieve context for public safety / police activity queries."""
    from backend.predictive.mock_data import load_events

    news = get_news()
    safety_keywords = [
        "police", "crime", "arrest", "shooting", "incident",
        "investigation", "emergency", "fire", "accident", "safety",
    ]
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

    events = load_events()
    area_events = _filter_area_events(events, entities.neighborhood or "")
    for e in area_events:
        sources.append(SourceItem(
            title=f"Nearby event: {e['name']}",
            description=(
                f"{e.get('date', '')} in {e.get('neighborhood', '')} "
                f"— {e.get('expected_attendance', '?')} expected"
            ),
            category="event_safety",
        ))

    context = _build_safety_context(safety_articles, area_events)
    return sources, context


def _filter_area_events(events: list[dict], neighborhood: str) -> list[dict]:
    """Filter events by neighborhood and attendance threshold."""
    if neighborhood:
        matches = [
            e for e in events
            if neighborhood.lower() in e.get("neighborhood", "").lower()
            and e.get("expected_attendance", 0) >= 500
        ]
    else:
        matches = [e for e in events if e.get("expected_attendance", 0) >= 2000]
    return matches[:3]


def _build_safety_context(
    safety_articles: list[dict], area_events: list[dict]
) -> str:
    """Build reasoning context for public safety queries."""
    context_parts = ["Public safety analysis for Montgomery:"]
    if safety_articles:
        context_parts.append("Recent safety-related news:")
        for a in safety_articles:
            context_parts.append(f"  - {a.get('title', '')}")
    if area_events:
        context_parts.append("Large events nearby (may explain increased police presence):")
        for e in area_events:
            context_parts.append(
                f"  - {e['name']} ({e.get('date', '')}, ~{e.get('expected_attendance', 0)} people)"
            )
    context_parts.append(
        "For emergencies, call 911. For non-emergencies, call Montgomery PD at 334-625-2831."
    )
    return "\n".join(context_parts)


def retrieve_trending_issues() -> tuple[list[SourceItem], str]:
    """Pull trend data from predictive engine for chat responses."""
    try:
        from backend.predictive.trend_detector import detect_trends
        trends = detect_trends()
        sources = [
            SourceItem(
                title=f"{t.category.replace('_', ' ').title()} — {t.trend_direction}",
                description=(
                    f"{t.current_volume} reports (growth: {t.growth_rate:+.0%}). "
                    f"Top areas: {', '.join(t.top_neighborhoods[:2])}"
                ),
                category="trend",
            )
            for t in trends[:5]
        ]
        context = "Current civic trends in Montgomery:\n"
        for t in trends[:5]:
            context += (
                f"- {t.category.replace('_', ' ').title()}: "
                f"{t.current_volume} reports, {t.trend_direction} ({t.growth_rate:+.0%})\n"
                f"  Top areas: {', '.join(t.top_neighborhoods[:3])}\n"
            )
        return sources, context
    except Exception as exc:
        logger.warning("Failed to load trends: %s", exc)
        return [], "Trend data temporarily unavailable."


def retrieve_job_loss_support(
    entities: ExtractedEntities,
    message: str,
    get_gov_services: object,
) -> tuple[list[SourceItem], list, str]:
    """Grouped recommendations across employment, food, health, housing."""
    from backend.predictive.mock_data import load_events
    from backend.chatbot.retrieval_services import retrieve_services_multi

    multi_sources = retrieve_services_multi(
        ["employment", "food", "health", "housing", "legal"],
        get_gov_services,
    )

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
