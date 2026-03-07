"""Answer text builders for follow-up conversation handlers."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def build_traffic_followup_answer(lower: str, ctx: object) -> str:
    """Build the answer text for a traffic follow-up."""
    if "event" in lower or "because" in lower:
        event_items = [r for r in ctx.last_results if r.get("category") == "event_traffic"]  # type: ignore[union-attr]
        if event_items:
            lines = ["Yes, these large upcoming events could be contributing to traffic:", ""]
            for e in event_items[:4]:
                lines.append(f"  📅 {e.get('title', '')} — {e.get('description', '')}")
            lines.append("")
            lines.append("Large events often require road closures and traffic control.")
            return "\n".join(lines)
        return (
            "It's possible — large events often cause traffic congestion in Montgomery.\n"
            "I don't have specific event-related traffic data right now,\n"
            "but you can check montgomeryalabama.gov/events for today's schedule."
        )

    if "road closure" in lower or "closure" in lower or "closed" in lower:
        traffic_items = [r for r in ctx.last_results if r.get("category") == "traffic"]  # type: ignore[union-attr]
        if traffic_items:
            lines = ["Here are recent road and construction reports:", ""]
            for t in traffic_items[:4]:
                lines.append(f"  🚧 {t.get('title', '')}")
            lines.append("")
            lines.append("For real-time closures, check ALDOT at algotraffic.com.")
            return "\n".join(lines)
        return (
            "I don't have specific road closure data right now.\n"
            "Check ALDOT at algotraffic.com for real-time road closure information."
        )

    return (
        "I can help you dig deeper into the traffic situation. "
        "Would you like to check:\n"
        "  • Upcoming events that may cause congestion\n"
        "  • Road closures and construction\n"
        "  • Alternative routes"
    )


def build_new_resident_followup_answer(lower: str) -> str:
    """Build answer text for new resident follow-up."""
    if "kid" in lower or "child" in lower or "children" in lower:
        lines = [
            "Great to know! With children, here are some key services for your family:",
            "",
            "  🏫 Montgomery Public Schools — enrollment at mps.k12.al.us",
            "  👶 Childcare assistance — Apply through Montgomery County DHR",
            "  🏥 ALL Kids health insurance — free/low-cost coverage for children",
            "  🌳 Parks with playgrounds — Lagoon Park, Gateway Park, Blount Cultural Park",
            "",
            "Would you like details on any of these?",
        ]
        return "\n".join(lines)

    if "job" in lower or "work" in lower or "career" in lower or "employ" in lower:
        lines = [
            "For job help as a new Montgomery resident:",
            "",
            "  💼 Alabama Career Center: 334-286-1746 (free job search, resume help)",
            "  📅 Montgomery Job Fair — check montgomeryalabama.gov/events",
            "  📚 Public Library — free computer access for job applications",
            "  🎓 WIOA training programs through AIDT",
            "",
            "Would you like more details on any of these?",
        ]
        return "\n".join(lines)

    lines = [
        "Thanks for sharing! I can help you find specific services.",
        "What are you looking for? For example:",
        "  • Schools and childcare",
        "  • Job search help",
        "  • Healthcare",
        "  • Housing assistance",
    ]
    return "\n".join(lines)


def build_refined_answer(
    refined: list[dict], filter_desc: str, topic: str | None, ctx: object,
) -> str:
    """Build an answer from refined/filtered prior results."""
    count = len(refined)
    topic_label = _get_topic_label(topic or "")

    if filter_desc:
        header = (
            f"From the previous {topic_label}, here are the ones matching "
            f"'{filter_desc}' ({count} result{'s' if count != 1 else ''}):"
        )
    else:
        header = f"Here are the refined {topic_label} ({count} result{'s' if count != 1 else ''}):"

    lines = [header, ""]
    for item in refined[:6]:
        title = item.get("title", "")
        desc = item.get("description", "")
        if topic == "events":
            lines.append(f"  📅 {title} — {desc}")
        elif topic in ("services", "jobs"):
            lines.append(f"  {title}")
            if desc:
                lines.append(f"  {desc[:100]}")
            lines.append("")
        else:
            lines.append(f"  • {title}")
            if desc:
                lines.append(f"    {desc[:100]}")

    if not refined:
        lines.append("  (No results matched that filter.)")
        lines.append("")
        lines.append(f"Would you like me to show all {topic_label} again?")

    return "\n".join(lines)


def _get_topic_label(topic: str) -> str:
    """Human-readable label for a topic."""
    labels = {
        "events": "events",
        "services": "services",
        "trash": "trash pickup info",
        "traffic": "traffic info",
        "safety": "safety info",
        "jobs": "job resources",
        "new_resident": "new resident info",
        "trending": "trending issues",
    }
    return labels.get(topic, "results")
