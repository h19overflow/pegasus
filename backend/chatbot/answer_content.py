"""Answer builders for events, services, traffic, job loss, and public safety."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def answer_events(lower: str, sources: list) -> str:
    """Date-aware, volunteer-aware event answers."""
    from backend.models import SourceItem
    from backend.chatbot.date_utils import parse_temporal_intent

    event_sources = [s for s in sources if isinstance(s, SourceItem)]
    non_news_sources = [s for s in event_sources if s.category != "news"]
    date_range = parse_temporal_intent(lower)

    if not non_news_sources:
        if date_range:
            return (
                f"I couldn't find events specifically for {date_range.label}, "
                "but here are some upcoming events in Montgomery you might enjoy. "
                "Check montgomeryalabama.gov/events for the full calendar."
            )
        return "I don't have specific event information right now. Check montgomeryalabama.gov/events for the latest."

    header = _build_events_header(lower, date_range)
    lines = [header, ""]
    for s in event_sources[:6]:
        if s.category == "news":
            lines.append(f"  📰 {s.title}")
        else:
            lines.append(f"  📅 {s.title} — {s.description}")
    lines.append("")
    lines.append("Visit montgomeryalabama.gov/events for the full calendar.")
    return "\n".join(lines)


def _build_events_header(lower: str, date_range: object | None) -> str:
    """Build the header line for event answers."""
    if "volunteer" in lower:
        return "Here are community and civic events where you can volunteer in Montgomery:"
    if date_range:
        return f"Here's what's happening in Montgomery {date_range.label}:"
    if "free" in lower or "community" in lower:
        return "Here are free and community events coming up in Montgomery:"
    if "family" in lower or "kid" in lower:
        return "Here are some family-friendly events in Montgomery:"
    if "food" in lower or "market" in lower:
        return "Here are food and market events in Montgomery:"
    if "job" in lower or "career" in lower:
        return "Here are upcoming job and career events in Montgomery:"
    return "Here are upcoming events in Montgomery:"


def answer_find_service(lower: str, entities: dict, sources: list) -> str:
    """Handle service search including parks/playgrounds."""
    from backend.models import SourceItem

    service_sources = [s for s in sources if isinstance(s, SourceItem)]
    cat = entities.get("service_category", "service")

    if "park" in lower or "playground" in lower or "trail" in lower:
        return _build_parks_answer(service_sources)
    if "computer" in lower or "internet access" in lower or "wifi" in lower:
        return _build_computer_access_answer(lower, service_sources)
    if not service_sources:
        return f"I couldn't find specific {cat} services right now. Try browsing the Services tab or call 311 for help."

    if _is_compound_service_query(service_sources):
        return _build_compound_service_answer(service_sources)
    return _build_standard_service_answer(cat, service_sources)


def _build_parks_answer(service_sources: list) -> str:
    """Build parks and recreation answer."""
    lines = ["Here are parks and recreation options in Montgomery:", ""]
    if service_sources:
        for s in service_sources[:4]:
            lines.append(f"  🌳 {s.title}")
            if s.description:
                lines.append(f"     {s.description[:100]}")
    else:
        lines.extend([
            "  🌳 Blount Cultural Park — trails, gardens, and museums",
            "  🌳 Riverwalk Park — scenic walking trail along the Alabama River",
            "  🌳 Lagoon Park — playground, golf, and picnic areas",
            "  🌳 Gateway Park — splash pad and playground",
        ])
    lines.append("")
    lines.append("Check montgomeryparks.com for hours and amenities.")
    return "\n".join(lines)


def _build_computer_access_answer(lower: str, service_sources: list) -> str:
    """Build computer/internet access answer."""
    lines = ["Here are places with free computer and internet access in Montgomery:", ""]
    for s in service_sources[:3]:
        lines.append(f"  💻 {s.title}")
        if s.description:
            lines.append(f"     {s.description[:100]}")
        lines.append("")
    lines.extend([
        "  📚 Montgomery City-County Public Library (main branch)",
        "     Free computer access, WiFi, printing, and job search help",
        "     245 High St, Montgomery — 334-240-4300",
        "",
        "  📚 Rufus A. Lewis Regional Library",
        "     Free computers, WiFi, and community programs",
        "     3095 Mobile Hwy, Montgomery — 334-625-4872",
        "",
    ])
    if "job" in lower or "apply" in lower:
        lines.append("💡 Tip: The Career Center and libraries both offer free help with online job applications.")
    lines.append("")
    lines.append("You can also browse all services in the Services tab.")
    return "\n".join(lines)


def _is_compound_service_query(service_sources: list) -> bool:
    """Check if this is a compound multi-category service query."""
    return len(service_sources) > 1 and any(
        s.category != service_sources[0].category
        for s in service_sources
        if hasattr(s, "category")
    )


def _build_compound_service_answer(service_sources: list) -> str:
    """Build answer for compound multi-category service queries."""
    header = f"I found {len(service_sources)} resources that can help:"
    lines = [header, ""]
    for s in service_sources[:6]:
        cat_label = (s.category or "").replace("_", " ").title()
        lines.append(f"  {s.title}")
        if s.description:
            lines.append(f"  {s.description[:100]}")
        if cat_label:
            lines.append(f"  📌 Category: {cat_label}")
        lines.append("")
    lines.append("You can also browse all services in the Services tab.")
    return "\n".join(lines)


def _build_standard_service_answer(cat: str, service_sources: list) -> str:
    """Build standard service answer."""
    count = len(service_sources)
    header = f"I found {count} {cat} resource{'s' if count != 1 else ''} in Montgomery:"
    lines = [header, ""]
    for s in service_sources[:4]:
        lines.append(f"  {s.title}")
        if s.description:
            lines.append(f"  {s.description[:100]}")
        lines.append("")
    lines.append("You can also browse all services in the Services tab.")
    return "\n".join(lines)


def answer_traffic(lower: str, sources: list) -> str:
    """Traffic reasoning with confidence and multi-source analysis."""
    from backend.models import SourceItem

    traffic_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "traffic"]
    event_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "event_traffic"]

    lines = ["Here's my traffic analysis for Montgomery:", ""]
    if traffic_sources:
        lines.append("Recent traffic reports:")
        for s in traffic_sources[:3]:
            lines.append(f"  🚧 {s.title}")
    if event_sources:
        lines.append("")
        lines.append("Large events that may affect traffic:")
        for s in event_sources[:3]:
            lines.append(f"  📅 {s.title} — {s.description}")

    if traffic_sources or event_sources:
        confidence = "moderate" if len(traffic_sources) + len(event_sources) >= 3 else "low"
        lines.append("")
        lines.append(
            f"Confidence: {confidence} (based on {len(traffic_sources)} news reports "
            f"and {len(event_sources)} upcoming events)"
        )
    else:
        lines.append("No current traffic disruptions found in recent data.")

    lines.append("")
    lines.append("For real-time updates, check ALDOT at algotraffic.com or call 311.")
    return "\n".join(lines)


def answer_job_loss(lower: str, sources: list) -> str:
    """Grouped job loss support across multiple categories."""
    from backend.models import SourceItem

    lines = [
        "I'm sorry to hear that. Here are resources organized by what you might need:",
        "",
        "💼 Employment:",
        "  - Alabama Career Center: 334-286-1746",
        "  - File unemployment at labor.alabama.gov",
        "  - WIOA job training programs through AIDT",
        "",
        "🍎 Food Assistance:",
        "  - SNAP benefits: Apply at Montgomery County DHR",
        "  - Montgomery Area Food Bank: 334-263-3784",
        "",
        "🏥 Healthcare:",
        "  - Medicaid enrollment at Montgomery County DHR",
        "  - Community health clinics (sliding scale fees)",
        "",
        "🏠 Housing Help:",
        "  - Emergency rental assistance through Montgomery Housing Authority",
        "  - Section 8 vouchers: 334-206-1800",
        "",
    ]

    event_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "employment_event"]
    if event_sources:
        lines.append("📅 Upcoming Job Events:")
        for s in event_sources[:2]:
            lines.append(f"  - {s.title} — {s.description}")
        lines.append("")

    lines.append("Would you like more details on any of these areas?")
    return "\n".join(lines)


def answer_public_safety(lower: str, entities: dict, sources: list) -> str:
    """Reasoning-based answer for public safety / police activity queries."""
    from backend.models import SourceItem

    hood = entities.get("neighborhood", "the area")
    news_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "public_safety"]
    event_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "event_safety"]

    lines = [f"There appears to be increased police or emergency activity near {hood} today.", ""]
    lines.append("Possible reasons could include:")

    if event_sources:
        lines.append("  - Traffic control or security for a nearby event:")
        for s in event_sources[:2]:
            lines.append(f"    📅 {s.title} — {s.description}")
    else:
        lines.append("  - Traffic control for an event or public gathering")

    lines.extend([
        "  - A public safety incident or investigation",
        "  - Routine patrol or training exercise",
        "",
    ])

    if news_sources:
        lines.append("Recent safety-related news:")
        for s in news_sources[:3]:
            lines.append(f"  📰 {s.title}")
        lines.append("")

    lines.extend([
        "I can help you check:",
        "  • Downtown events happening today",
        "  • Current traffic updates",
        "  • Road closures in the area",
        "",
        "For emergencies, call 911. For non-emergencies, call Montgomery PD at 334-625-2831.",
    ])
    return "\n".join(lines)
