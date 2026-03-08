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
from backend.chatbot.responder_constants import (
    CIVIC_SYSTEM_PROMPT, INTENT_CHIPS, INTENT_ACTIONS,
)

logger = logging.getLogger(__name__)


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
