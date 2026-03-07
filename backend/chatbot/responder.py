"""Chatbot responder — orchestrates intent, entities, retrieval, and LLM.

Flow:
1. Classify intent (deterministic)
2. Extract entities (deterministic)
3. Check for missing required entities → follow-up question
4. Retrieve context from local data
5. Generate answer (Gemini if available, else template)
6. Assemble structured ChatResponse with reasoning
"""

from __future__ import annotations

import logging
from dataclasses import asdict

from backend.models import ChatRequest, ChatResponse, CivicIntent
from backend.chatbot.intents import classify_intent
from backend.chatbot.entities import extract_entities
from backend.chatbot.followup import check_followup
from backend.chatbot.retrieval import retrieve_context
from backend.chatbot.llm_provider import get_llm_provider
from backend.chatbot.answer_templates import (
    get_fallback_answer, build_gemini_prompt, build_reasoning,
    build_summary, build_template_answer,
)
from backend.chatbot.followup_handlers import handle_followup

logger = logging.getLogger(__name__)

CIVIC_SYSTEM_PROMPT = """You are a helpful civic assistant for the City of Montgomery, Alabama.
Your role is to help citizens with city services, issue reporting, events, and neighborhood information.
Be concise, friendly, and actionable. Always suggest concrete next steps.
If you reference a service or resource, include its name and how to access it.
Keep responses under 150 words. Use plain language accessible to all reading levels."""


# ── Chips and actions per intent ─────────────────────────

INTENT_CHIPS: dict[CivicIntent, list[str]] = {
    CivicIntent.REPORT_ISSUE: [
        "Report a pothole", "Streetlight is out",
        "Trash not collected", "Check my report status",
    ],
    CivicIntent.FIND_SERVICE: [
        "Healthcare near me", "Childcare options",
        "Food assistance", "Job training programs",
    ],
    CivicIntent.CITY_EVENTS: [
        "Events this weekend", "Free community events",
        "Family-friendly activities", "Volunteer opportunities",
    ],
    CivicIntent.TRAFFIC_DISRUPTION: [
        "Current road closures", "Construction updates",
        "Why is traffic bad today?",
    ],
    CivicIntent.NEIGHBORHOOD_SUMMARY: [
        "Schools in my area", "Safety information", "Nearby services",
    ],
    CivicIntent.SUGGEST_NEXT_STEP: [
        "Help me find a job", "Benefits I qualify for",
        "Get started with city services",
    ],
    CivicIntent.NEW_RESIDENT: [
        "Set up utilities", "Register to vote",
        "Find my trash schedule", "Parks near me",
    ],
    CivicIntent.JOB_LOSS_SUPPORT: [
        "File for unemployment", "Food assistance",
        "Job training programs", "Healthcare options",
    ],
    CivicIntent.TRENDING_ISSUES: [
        "Pothole reports", "Infrastructure updates",
        "Community safety", "Upcoming events",
    ],
    CivicIntent.PUBLIC_SAFETY: [
        "Check downtown events", "Traffic updates",
        "Report an incident", "Call non-emergency line",
    ],
    CivicIntent.GENERAL: [
        "Report an issue", "Find a service",
        "City events", "Traffic updates",
    ],
}

INTENT_ACTIONS: dict[CivicIntent, list[dict]] = {
    CivicIntent.REPORT_ISSUE: [
        {"label": "Report online at 311", "action_type": "link", "url": "https://www.montgomeryalabama.gov/311"},
        {"label": "Call 311", "action_type": "phone"},
    ],
    CivicIntent.FIND_SERVICE: [
        {"label": "Browse all services", "action_type": "navigate", "url": "/app/services"},
    ],
    CivicIntent.CITY_EVENTS: [
        {"label": "View community calendar", "action_type": "link", "url": "https://www.montgomeryalabama.gov/events"},
    ],
    CivicIntent.TRAFFIC_DISRUPTION: [
        {"label": "Check ALDOT traffic", "action_type": "link", "url": "https://algotraffic.com"},
    ],
    CivicIntent.NEW_RESIDENT: [
        {"label": "Browse city services", "action_type": "navigate", "url": "/app/services"},
        {"label": "Montgomery 311", "action_type": "link", "url": "https://www.montgomeryalabama.gov/311"},
    ],
    CivicIntent.JOB_LOSS_SUPPORT: [
        {"label": "Alabama Career Center", "action_type": "link", "url": "https://joblink.alabama.gov"},
        {"label": "File unemployment", "action_type": "link", "url": "https://labor.alabama.gov"},
        {"label": "SNAP benefits", "action_type": "link", "url": "https://dhr.alabama.gov"},
    ],
    CivicIntent.TRENDING_ISSUES: [
        {"label": "Report an issue", "action_type": "link", "url": "https://www.montgomeryalabama.gov/311"},
    ],
    CivicIntent.PUBLIC_SAFETY: [
        {"label": "Montgomery PD non-emergency", "action_type": "phone"},
        {"label": "Check traffic updates", "action_type": "link", "url": "https://algotraffic.com"},
        {"label": "Report an incident", "action_type": "link", "url": "https://www.montgomeryalabama.gov/311"},
    ],
}


# ── Main handler ─────────────────────────────────────────

async def handle_chat(request: ChatRequest) -> ChatResponse:
    """Process a chat message and return a structured response."""
    from backend.chatbot.context_memory import (
        get_context, save_context, detect_followup, detect_topic_switch,
        intent_to_topic, result_type_for_intent,
    )

    message = request.message.strip()
    conv_id = request.conversation_id

    if not message:
        return ChatResponse(
            intent=CivicIntent.GENERAL.value,
            answer="I didn't catch that. Could you rephrase your question?",
            confidence=0.0,
            chips=INTENT_CHIPS[CivicIntent.GENERAL],
        )

    ctx = get_context(conv_id)
    is_followup = detect_followup(message, ctx)
    is_switch = detect_topic_switch(message, ctx)

    if is_followup and ctx and not is_switch:
        followup_result = await handle_followup(
            request, message, conv_id, ctx, INTENT_CHIPS, INTENT_ACTIONS,
        )
        if followup_result is not None:
            return followup_result

    intent, confidence = classify_intent(message)
    entities = extract_entities(message)
    entity_dict = {k: v for k, v in asdict(entities).items() if v is not None}

    followup_question = check_followup(intent, entities)
    if followup_question:
        save_context(
            conv_id, intent.value, message, [],
            entity_dict, intent_to_topic(intent.value),
            result_type_for_intent(intent.value),
        )
        return ChatResponse(
            intent=intent.value,
            answer=get_fallback_answer(intent),
            confidence=confidence,
            extracted_entities=entity_dict,
            follow_up_question=followup_question,
            chips=INTENT_CHIPS.get(intent, INTENT_CHIPS[CivicIntent.GENERAL]),
            suggested_actions=INTENT_ACTIONS.get(intent, []),
        )

    sources, highlights, context_text = retrieve_context(intent, entities, message)
    answer, reasoning, summary, warnings = await _generate_answer(
        intent, message, context_text, entity_dict, sources,
    )

    source_dicts = [asdict(s) for s in sources]
    save_context(
        conv_id, intent.value, message, source_dicts,
        entity_dict, intent_to_topic(intent.value),
        result_type_for_intent(intent.value),
    )

    return ChatResponse(
        intent=intent.value,
        answer=answer,
        confidence=confidence,
        extracted_entities=entity_dict,
        follow_up_question=None,
        suggested_actions=INTENT_ACTIONS.get(intent, []),
        source_items=source_dicts,
        map_highlights=[asdict(h) for h in highlights],
        chips=INTENT_CHIPS.get(intent, INTENT_CHIPS[CivicIntent.GENERAL]),
        answer_summary=summary,
        reasoning_notes=reasoning,
        warnings=warnings,
        source_count=len(sources),
    )


async def _generate_answer(
    intent: CivicIntent,
    message: str,
    context: str,
    entities: dict,
    sources: list | None = None,
) -> tuple[str, str | None, str | None, list[str]]:
    """Generate answer, reasoning, summary, and warnings."""
    provider = get_llm_provider()
    warnings: list[str] = []

    from backend.chatbot.llm_provider import MockLLMProvider
    if provider.is_available() and not isinstance(provider, MockLLMProvider):
        prompt = build_gemini_prompt(intent, message, context, entities)
        llm_answer = await provider.generate(prompt, CIVIC_SYSTEM_PROMPT)
        if llm_answer:
            summary = llm_answer[:80].split(".")[0] + "." if "." in llm_answer[:80] else llm_answer[:80]
            return llm_answer, "Generated via Gemini AI", summary, warnings

    answer = build_template_answer(intent, message, entities, sources or [])
    reasoning = build_reasoning(intent, entities, sources or [])
    summary = build_summary(intent, entities)

    return answer, reasoning, summary, warnings
