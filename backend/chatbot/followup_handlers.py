"""Follow-up conversation handlers for multi-turn civic chat."""

from __future__ import annotations

import logging

from backend.models import ChatResponse, CivicIntent

logger = logging.getLogger(__name__)


async def handle_followup(
    request: object,
    message: str,
    conv_id: str | None,
    ctx: "ConversationContext",
    intent_chips: dict,
    intent_actions: dict,
) -> ChatResponse | None:
    """Handle a follow-up question by refining prior results.

    Returns a ChatResponse if handled, or None to fall through to normal flow.
    """
    from backend.chatbot.context_memory import (
        save_context, refine_results,
    )
    from backend.models import ConversationContext

    lower = message.lower()
    prior_intent = ctx.last_intent or CivicIntent.GENERAL.value
    prior_topic = ctx.last_topic

    report_response = _try_handle_report_followup(
        lower, message, conv_id, ctx, prior_topic, intent_chips, intent_actions,
    )
    if report_response is not None:
        return report_response

    trash_schedule_response = _try_handle_trash_schedule_followup(
        lower, message, conv_id, ctx, prior_topic, intent_chips, intent_actions,
    )
    if trash_schedule_response is not None:
        return trash_schedule_response

    if prior_topic == "traffic":
        return await handle_traffic_followup(message, conv_id, ctx, intent_actions)

    if prior_topic == "new_resident":
        return await handle_new_resident_followup(message, conv_id, ctx, intent_actions)

    if ctx.last_results:
        return _try_refine_results(
            lower, message, conv_id, ctx, prior_intent, prior_topic,
            intent_chips, intent_actions,
        )

    return None


def _try_handle_report_followup(
    lower: str,
    message: str,
    conv_id: str | None,
    ctx: "ConversationContext",
    prior_topic: str | None,
    intent_chips: dict,
    intent_actions: dict,
) -> ChatResponse | None:
    """Handle 'help me report it too' type follow-ups."""
    from backend.chatbot.context_memory import save_context

    if not ("report" in lower and ("it" in lower or "too" in lower or "also" in lower)):
        return None

    if prior_topic == "trash":
        answer = (
            "Sure! You can report the missed trash pickup:\n\n"
            "  - Online: montgomeryalabama.gov/311\n"
            "  - Phone: Call 311\n\n"
            "Reports are usually addressed within 1-2 business days."
        )
    else:
        answer = (
            "You can report civic issues through Montgomery 311:\n\n"
            "  - Online: montgomeryalabama.gov/311\n"
            "  - Phone: Call 311"
        )

    intent_val = CivicIntent.REPORT_ISSUE.value
    intent_enum = CivicIntent.REPORT_ISSUE
    save_context(conv_id, intent_val, message, ctx.last_results,
                 ctx.last_entities, prior_topic, "report_info")
    return ChatResponse(
        intent=intent_val, answer=answer, confidence=0.8,
        extracted_entities=ctx.last_entities,
        chips=intent_chips.get(intent_enum, intent_chips[CivicIntent.GENERAL]),
        suggested_actions=intent_actions.get(intent_enum, []),
        answer_summary="Report via Montgomery 311",
        reasoning_notes=f"Follow-up to {prior_topic} conversation | report request",
        source_count=0,
    )


def _try_handle_trash_schedule_followup(
    lower: str,
    message: str,
    conv_id: str | None,
    ctx: "ConversationContext",
    prior_topic: str | None,
    intent_chips: dict,
    intent_actions: dict,
) -> ChatResponse | None:
    """Handle 'check the schedule' follow-up for trash topics."""
    from backend.chatbot.context_memory import save_context

    if not (prior_topic == "trash" and ("schedule" in lower or "pickup" in lower)):
        return None

    answer = (
        "Here's your Montgomery trash pickup schedule:\n\n"
        "  North Montgomery: Monday & Thursday\n"
        "  South Montgomery: Tuesday & Friday\n"
        "  Downtown: Wednesday\n\n"
        "If your trash wasn't collected on schedule, you can report it via 311."
    )
    save_context(conv_id, CivicIntent.REPORT_ISSUE.value, message,
                 ctx.last_results, ctx.last_entities, "trash", "report_info")
    return ChatResponse(
        intent=CivicIntent.REPORT_ISSUE.value, answer=answer, confidence=0.8,
        extracted_entities=ctx.last_entities,
        chips=intent_chips[CivicIntent.REPORT_ISSUE],
        suggested_actions=intent_actions[CivicIntent.REPORT_ISSUE],
        answer_summary="Trash pickup schedule",
        reasoning_notes="Follow-up to trash conversation | schedule request",
        source_count=0,
    )


def _try_refine_results(
    lower: str,
    message: str,
    conv_id: str | None,
    ctx: "ConversationContext",
    prior_intent: str,
    prior_topic: str | None,
    intent_chips: dict,
    intent_actions: dict,
) -> ChatResponse | None:
    """Try to refine prior results based on follow-up message."""
    from backend.chatbot.context_memory import save_context, refine_results

    refined, filter_desc = refine_results(message, ctx.last_results)

    if not (refined and (filter_desc or refined != ctx.last_results)):
        return None

    answer = build_refined_answer(refined, filter_desc, prior_topic, ctx)
    save_context(conv_id, prior_intent, message, refined,
                 ctx.last_entities, prior_topic, ctx.last_result_type,
                 {**ctx.last_filters, "refinement": filter_desc})
    try:
        intent_enum = CivicIntent(prior_intent)
    except ValueError:
        intent_enum = CivicIntent.GENERAL
    return ChatResponse(
        intent=prior_intent, answer=answer, confidence=0.75,
        extracted_entities=ctx.last_entities,
        chips=intent_chips.get(intent_enum, intent_chips[CivicIntent.GENERAL]),
        suggested_actions=intent_actions.get(intent_enum, []),
        answer_summary=f"Refined results ({filter_desc})" if filter_desc else "Refined results",
        reasoning_notes=f"Follow-up refinement on {prior_topic} | filter: {filter_desc}",
        source_items=refined,
        source_count=len(refined),
    )


async def handle_traffic_followup(
    message: str, conv_id: str | None, ctx: "ConversationContext", intent_actions: dict,
) -> ChatResponse:
    """Handle traffic-related follow-ups like 'is it because of events?'"""
    from backend.chatbot.context_memory import save_context
    from backend.models import ConversationContext

    lower = message.lower()
    answer = _build_traffic_followup_answer(lower, ctx)

    save_context(conv_id, CivicIntent.TRAFFIC_DISRUPTION.value, message,
                 ctx.last_results, ctx.last_entities, "traffic", "traffic_info")
    return ChatResponse(
        intent=CivicIntent.TRAFFIC_DISRUPTION.value, answer=answer, confidence=0.75,
        extracted_entities=ctx.last_entities,
        chips=["Which events?", "Road closures?", "Alternative routes"],
        suggested_actions=intent_actions[CivicIntent.TRAFFIC_DISRUPTION],
        answer_summary="Traffic follow-up",
        reasoning_notes=f"Follow-up to traffic conversation | turn {ctx.turn_count + 1}",
        source_count=len(ctx.last_results),
    )


def _build_traffic_followup_answer(lower: str, ctx: "ConversationContext") -> str:
    """Build the answer text for a traffic follow-up."""
    if "event" in lower or "because" in lower:
        event_items = [r for r in ctx.last_results if r.get("category") == "event_traffic"]
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
        traffic_items = [r for r in ctx.last_results if r.get("category") == "traffic"]
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


async def handle_new_resident_followup(
    message: str, conv_id: str | None, ctx: "ConversationContext", intent_actions: dict,
) -> ChatResponse:
    """Handle new resident follow-ups like 'I have two kids' or 'I also need job help'."""
    from backend.chatbot.context_memory import save_context
    from backend.models import ConversationContext

    lower = message.lower()
    answer = _build_new_resident_followup_answer(lower)

    save_context(conv_id, CivicIntent.NEW_RESIDENT.value, message,
                 ctx.last_results, ctx.last_entities, "new_resident", "onboarding_info")
    return ChatResponse(
        intent=CivicIntent.NEW_RESIDENT.value, answer=answer, confidence=0.75,
        extracted_entities=ctx.last_entities,
        chips=["Schools nearby", "Childcare options", "Job help", "Healthcare"],
        suggested_actions=intent_actions[CivicIntent.NEW_RESIDENT],
        answer_summary="New resident follow-up",
        reasoning_notes=f"Follow-up to new_resident conversation | turn {ctx.turn_count + 1}",
        source_count=0,
    )


def _build_new_resident_followup_answer(lower: str) -> str:
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
    refined: list[dict], filter_desc: str, topic: str | None, ctx: "ConversationContext",
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
