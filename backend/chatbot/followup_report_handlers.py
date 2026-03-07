"""Follow-up handlers for report and trash schedule follow-up conversations."""

from __future__ import annotations

import logging

from backend.models import ChatResponse, CivicIntent

logger = logging.getLogger(__name__)


def try_handle_report_followup(
    lower: str,
    message: str,
    conv_id: str | None,
    ctx: object,
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
    save_context(conv_id, intent_val, message, ctx.last_results,  # type: ignore[union-attr]
                 ctx.last_entities, prior_topic, "report_info")  # type: ignore[union-attr]
    return ChatResponse(
        intent=intent_val, answer=answer, confidence=0.8,
        extracted_entities=ctx.last_entities,  # type: ignore[union-attr]
        chips=intent_chips.get(intent_enum, intent_chips[CivicIntent.GENERAL]),
        suggested_actions=intent_actions.get(intent_enum, []),
        answer_summary="Report via Montgomery 311",
        reasoning_notes=f"Follow-up to {prior_topic} conversation | report request",
        source_count=0,
    )


def try_handle_trash_schedule_followup(
    lower: str,
    message: str,
    conv_id: str | None,
    ctx: object,
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
                 ctx.last_results, ctx.last_entities, "trash", "report_info")  # type: ignore[union-attr]
    return ChatResponse(
        intent=CivicIntent.REPORT_ISSUE.value, answer=answer, confidence=0.8,
        extracted_entities=ctx.last_entities,  # type: ignore[union-attr]
        chips=intent_chips[CivicIntent.REPORT_ISSUE],
        suggested_actions=intent_actions[CivicIntent.REPORT_ISSUE],
        answer_summary="Trash pickup schedule",
        reasoning_notes="Follow-up to trash conversation | schedule request",
        source_count=0,
    )
