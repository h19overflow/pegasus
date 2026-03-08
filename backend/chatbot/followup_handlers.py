"""Follow-up conversation handlers for multi-turn civic chat."""

from __future__ import annotations

import logging

from backend.models import ChatResponse, CivicIntent
from backend.chatbot.followup_answer_builders import build_refined_answer
from backend.chatbot.followup_topic_handlers import (
    handle_traffic_followup, handle_new_resident_followup,
)
from backend.chatbot.followup_report_handlers import (
    try_handle_report_followup, try_handle_trash_schedule_followup,
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

    report_response = try_handle_report_followup(
        lower, message, conv_id, ctx, prior_topic, intent_chips, intent_actions,
    )
    if report_response is not None:
        return report_response

    trash_schedule_response = try_handle_trash_schedule_followup(
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




