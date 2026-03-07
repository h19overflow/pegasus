"""Follow-up conversation handlers for multi-turn civic chat."""

from __future__ import annotations

import logging

from backend.models import ChatResponse, CivicIntent
from backend.chatbot.followup_answer_builders import build_refined_answer
from backend.chatbot.followup_topic_handlers import (
    handle_traffic_followup, handle_new_resident_followup,
)

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




