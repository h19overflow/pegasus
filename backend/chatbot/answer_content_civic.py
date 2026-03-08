"""Answer builders for traffic, job loss, and public safety responses."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


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
