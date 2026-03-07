"""Topic-specific follow-up handlers for traffic and new resident conversations."""

from __future__ import annotations

import logging

from backend.models import ChatResponse, CivicIntent
from backend.chatbot.followup_answer_builders import (
    build_traffic_followup_answer,
    build_new_resident_followup_answer,
)

logger = logging.getLogger(__name__)


async def handle_traffic_followup(
    message: str, conv_id: str | None, ctx: object, intent_actions: dict,
) -> ChatResponse:
    """Handle traffic-related follow-ups like 'is it because of events?'"""
    from backend.chatbot.context_memory import save_context

    lower = message.lower()
    answer = build_traffic_followup_answer(lower, ctx)

    save_context(conv_id, CivicIntent.TRAFFIC_DISRUPTION.value, message,
                 ctx.last_results, ctx.last_entities, "traffic", "traffic_info")  # type: ignore[union-attr]
    return ChatResponse(
        intent=CivicIntent.TRAFFIC_DISRUPTION.value, answer=answer, confidence=0.75,
        extracted_entities=ctx.last_entities,  # type: ignore[union-attr]
        chips=["Which events?", "Road closures?", "Alternative routes"],
        suggested_actions=intent_actions[CivicIntent.TRAFFIC_DISRUPTION],
        answer_summary="Traffic follow-up",
        reasoning_notes=f"Follow-up to traffic conversation | turn {ctx.turn_count + 1}",  # type: ignore[union-attr]
        source_count=len(ctx.last_results),  # type: ignore[union-attr]
    )


async def handle_new_resident_followup(
    message: str, conv_id: str | None, ctx: object, intent_actions: dict,
) -> ChatResponse:
    """Handle new resident follow-ups like 'I have two kids' or 'I also need job help'."""
    from backend.chatbot.context_memory import save_context

    lower = message.lower()
    answer = build_new_resident_followup_answer(lower)

    save_context(conv_id, CivicIntent.NEW_RESIDENT.value, message,
                 ctx.last_results, ctx.last_entities, "new_resident", "onboarding_info")  # type: ignore[union-attr]
    return ChatResponse(
        intent=CivicIntent.NEW_RESIDENT.value, answer=answer, confidence=0.75,
        extracted_entities=ctx.last_entities,  # type: ignore[union-attr]
        chips=["Schools nearby", "Childcare options", "Job help", "Healthcare"],
        suggested_actions=intent_actions[CivicIntent.NEW_RESIDENT],
        answer_summary="New resident follow-up",
        reasoning_notes=f"Follow-up to new_resident conversation | turn {ctx.turn_count + 1}",  # type: ignore[union-attr]
        source_count=0,
    )
