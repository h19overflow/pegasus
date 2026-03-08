"""Answer template builders for each CivicIntent.

Dispatches to domain-specific builders in answer_content.py and answer_content_misc.py.
"""

from __future__ import annotations

import logging

from backend.models import CivicIntent
from backend.chatbot.answer_content import (
    answer_events, answer_find_service,
)
from backend.chatbot.answer_content_civic import (
    answer_traffic, answer_job_loss, answer_public_safety,
)
from backend.chatbot.answer_content_misc import (
    answer_report_issue, answer_new_resident,
    answer_trending, answer_smart_fallback,
)

logger = logging.getLogger(__name__)


def get_fallback_answer(intent: CivicIntent) -> str:
    """Short fallback answer when we need a follow-up."""
    fallbacks = {
        CivicIntent.REPORT_ISSUE: "I can help you report that to Montgomery 311.",
        CivicIntent.FIND_SERVICE: "I can help you find city services.",
        CivicIntent.NEIGHBORHOOD_SUMMARY: "I can look up neighborhood info for you.",
    }
    return fallbacks.get(intent, "I'm here to help with Montgomery city services.")


def build_gemini_prompt(
    intent: CivicIntent, message: str, context: str, entities: dict,
) -> str:
    """Build a prompt for the Gemini LLM."""
    parts = [
        f"Citizen's question: {message}",
        f"Detected intent: {intent.value}",
    ]
    if entities:
        parts.append(f"Extracted info: {entities}")
    if context:
        parts.append(f"Relevant local data:\n{context}")
    parts.append(
        "Provide a helpful, concise answer (under 150 words). "
        "Reference specific Montgomery services, addresses, or phone numbers from the data when available. "
        "Suggest a clear next step the citizen can take."
    )
    return "\n\n".join(parts)


def build_reasoning(intent: CivicIntent, entities: dict, sources: list) -> str:
    """Explain why we gave this answer — for transparency."""
    parts = [f"Intent: {intent.value} (deterministic classifier)"]
    if entities:
        parts.append(f"Entities found: {', '.join(f'{k}={v}' for k, v in entities.items())}")
    parts.append(f"Sources consulted: {len(sources)}")
    return " | ".join(parts)


def build_summary(intent: CivicIntent, entities: dict) -> str:
    """One-line summary of the answer."""
    summaries = {
        CivicIntent.REPORT_ISSUE: "Issue reporting via Montgomery 311",
        CivicIntent.FIND_SERVICE: f"Found {entities.get('service_category', 'city')} services",
        CivicIntent.CITY_EVENTS: "Upcoming Montgomery events",
        CivicIntent.TRAFFIC_DISRUPTION: "Traffic analysis for Montgomery",
        CivicIntent.NEIGHBORHOOD_SUMMARY: f"Info about {entities.get('neighborhood', 'your area')}",
        CivicIntent.NEW_RESIDENT: "New resident onboarding guide",
        CivicIntent.JOB_LOSS_SUPPORT: "Job loss support resources",
        CivicIntent.TRENDING_ISSUES: "Current civic trends",
        CivicIntent.SUGGEST_NEXT_STEP: "Recommended next steps",
        CivicIntent.GENERAL: "Montgomery civic assistance",
    }
    return summaries.get(intent, "Montgomery civic assistance")


def build_template_answer(
    intent: CivicIntent, message: str, entities: dict, sources: list,
) -> str:
    """Dispatch to the domain-specific answer builder for this intent."""
    lower = message.lower()

    if intent == CivicIntent.REPORT_ISSUE:
        return answer_report_issue(lower, entities)
    if intent == CivicIntent.CITY_EVENTS:
        return answer_events(lower, sources)
    if intent == CivicIntent.FIND_SERVICE:
        return answer_find_service(lower, entities, sources)
    if intent == CivicIntent.TRAFFIC_DISRUPTION:
        return answer_traffic(lower, sources)
    if intent == CivicIntent.NEW_RESIDENT:
        return answer_new_resident(lower, entities)
    if intent == CivicIntent.JOB_LOSS_SUPPORT:
        return answer_job_loss(lower, sources)
    if intent == CivicIntent.TRENDING_ISSUES:
        return answer_trending(sources)
    if intent == CivicIntent.PUBLIC_SAFETY:
        return answer_public_safety(lower, entities, sources)
    if intent == CivicIntent.NEIGHBORHOOD_SUMMARY:
        hood = entities.get("neighborhood", "your area")
        return f"Here's what I know about {hood}. I've highlighted nearby services on the map for you."
    if intent == CivicIntent.SUGGEST_NEXT_STEP:
        return (
            "Based on what you've told me, here are some steps I'd recommend. "
            "Let me know which one you'd like to explore first."
        )

    return answer_smart_fallback(lower, entities, sources)
