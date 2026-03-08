"""Answer builders for report, new resident, trending, and fallback responses."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def answer_report_issue(lower: str, entities: dict) -> str:
    """Handle report_issue including trash schedule combo."""
    is_trash_schedule = "trash" in lower and any(
        w in lower for w in ["schedule", "pickup", "collected", "wasn't", "not"]
    )
    if is_trash_schedule:
        return _build_trash_schedule_answer(lower)

    issue = entities.get("issue_type", "").replace("_", " ")
    addr = entities.get("address", "")
    answer = f"I can help you report the {issue} issue" if issue else "I can help you report that issue"
    if addr:
        answer += f" at {addr}"
    answer += "."
    answer += "\n\nMontgomery's 311 system handles civic issues like potholes, streetlights, trash, and flooding."
    answer += "\n\nYou can report online at montgomeryalabama.gov/311 or call 311 directly."
    return answer


def _build_trash_schedule_answer(lower: str) -> str:
    """Build the trash pickup schedule answer."""
    lines = [
        "Here's your Montgomery trash pickup schedule:",
        "",
        "  North Montgomery: Monday & Thursday",
        "  South Montgomery: Tuesday & Friday",
        "  Downtown: Wednesday",
        "",
    ]
    if "not" in lower or "wasn't" in lower or "missed" in lower:
        lines.extend([
            "It sounds like your pickup was missed. You can report it:",
            "  - Online: montgomeryalabama.gov/311",
            "  - Phone: Call 311",
            "",
            "Reports are usually addressed within 1-2 business days.",
        ])
    else:
        lines.append("If your trash wasn't collected on schedule, you can report it via 311.")
    return "\n".join(lines)


def answer_new_resident(lower: str, entities: dict) -> str:
    """Curated new resident onboarding."""
    lines = [
        "Welcome to Montgomery! Here's your getting-started checklist:",
        "",
        "  1️⃣  Utilities — Contact Montgomery Water Works (334-206-1600) and Alabama Power",
        "  2️⃣  Driver's License — Visit Montgomery County DMV to transfer your license",
        "  3️⃣  Vehicle Registration — Register at the Montgomery County Revenue Office",
        "  4️⃣  Voter Registration — Montgomery County Board of Registrars or vote.org",
        "  5️⃣  Trash Schedule — North: Mon/Thu, South: Tue/Fri, Downtown: Wed",
        "  6️⃣  311 Services — Report issues at montgomeryalabama.gov/311",
        "",
        "Explore the Services tab to discover healthcare, parks, libraries, and more in your area.",
    ]
    return "\n".join(lines)


def answer_trending(sources: list) -> str:
    """Trending civic issues from predictive engine."""
    from backend.models import SourceItem

    trend_sources = [s for s in sources if isinstance(s, SourceItem)]
    if not trend_sources:
        return "I don't have trend data available right now. Check back soon for community insights."

    lines = ["Here's what Montgomery residents are reporting most:", ""]
    for s in trend_sources[:5]:
        lines.append(f"  📊 {s.title}")
        lines.append(f"     {s.description}")
    lines.append("")
    lines.append("This data comes from recent civic reports and helps the city prioritize resources.")
    return "\n".join(lines)


def answer_smart_fallback(lower: str, entities: dict, sources: list) -> str:
    """Smart fallback that attempts partial reasoning instead of a dead-end."""
    lines = ["I'm not sure I fully understand your question, but let me try to help.", ""]

    topic_hints = _detect_topic_hints(lower)

    if topic_hints:
        lines.append(f"It sounds like you might be asking about: {', '.join(topic_hints)}.")
        lines.append("")
        lines.append("Here's what I can help with:")
        lines.extend(_build_topic_hint_lines(topic_hints))
    else:
        lines.extend([
            "I can help you with:",
            "  • Report civic issues (potholes, streetlights, trash)",
            "  • Find city services (healthcare, childcare, food assistance)",
            "  • Check upcoming events and activities",
            "  • Get traffic and road closure updates",
            "  • Explore resources for new residents or job seekers",
        ])

    lines.append("")
    lines.append("Could you rephrase your question or pick one of the suggestions below?")
    return "\n".join(lines)


def _detect_topic_hints(lower: str) -> list[str]:
    """Detect topic hints from message text."""
    hints = []
    if any(w in lower for w in ["police", "cop", "siren", "crime", "emergency"]):
        hints.append("public safety")
    if any(w in lower for w in ["traffic", "road", "drive", "congestion"]):
        hints.append("traffic conditions")
    if any(w in lower for w in ["event", "festival", "happening", "weekend"]):
        hints.append("local events")
    if any(w in lower for w in ["job", "work", "career", "employ"]):
        hints.append("employment resources")
    if any(w in lower for w in ["trash", "garbage", "pickup", "sanitation"]):
        hints.append("sanitation services")
    if any(w in lower for w in ["health", "clinic", "doctor", "hospital"]):
        hints.append("healthcare services")
    return hints


def _build_topic_hint_lines(topic_hints: list[str]) -> list[str]:
    """Build suggestion lines based on detected topic hints."""
    lines = []
    if "public safety" in topic_hints:
        lines.append("  🚔 Check recent safety news and nearby events")
    if "traffic conditions" in topic_hints:
        lines.append("  🚧 Get traffic updates and road closure info")
    if "local events" in topic_hints:
        lines.append("  📅 Find upcoming events in Montgomery")
    if "employment resources" in topic_hints:
        lines.append("  💼 Find job resources and career centers")
    if "sanitation services" in topic_hints:
        lines.append("  🗑️ Check trash pickup schedules and report missed pickups")
    if "healthcare services" in topic_hints:
        lines.append("  🏥 Find health clinics and services")
    return lines
