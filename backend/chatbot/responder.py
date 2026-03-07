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
        refine_results, intent_to_topic, result_type_for_intent,
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

    # ── Load conversation context ────────────────────────
    ctx = get_context(conv_id)

    # ── Detect follow-up vs topic switch ─────────────────
    is_followup = detect_followup(message, ctx)
    is_switch = detect_topic_switch(message, ctx)

    # If it's a follow-up and we have prior context, try to refine
    if is_followup and ctx and not is_switch:
        followup_result = await _handle_followup(request, message, conv_id, ctx)
        if followup_result is not None:
            return followup_result
        # None means refinement didn't match — fall through to normal flow

    # ── Normal flow ──────────────────────────────────────
    # 1. Classify intent
    intent, confidence = classify_intent(message)

    # 2. Extract entities
    entities = extract_entities(message)
    entity_dict = {k: v for k, v in asdict(entities).items() if v is not None}

    # 3. Check for follow-up question (missing entities)
    followup = check_followup(intent, entities)
    if followup:
        # Still save context so next turn knows the topic
        save_context(
            conv_id, intent.value, message, [],
            entity_dict, intent_to_topic(intent.value),
            result_type_for_intent(intent.value),
        )
        return ChatResponse(
            intent=intent.value,
            answer=_get_fallback_answer(intent),
            confidence=confidence,
            extracted_entities=entity_dict,
            follow_up_question=followup,
            chips=INTENT_CHIPS.get(intent, INTENT_CHIPS[CivicIntent.GENERAL]),
            suggested_actions=INTENT_ACTIONS.get(intent, []),
        )

    # 4. Retrieve context
    sources, highlights, context_text = retrieve_context(intent, entities, message)

    # 5. Generate answer
    answer, reasoning, summary, warnings = await _generate_answer(
        intent, message, context_text, entity_dict, sources,
    )

    # 6. Save conversation context
    source_dicts = [asdict(s) for s in sources]
    save_context(
        conv_id, intent.value, message, source_dicts,
        entity_dict, intent_to_topic(intent.value),
        result_type_for_intent(intent.value),
    )

    # 7. Assemble response
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


async def _handle_followup(
    request: ChatRequest,
    message: str,
    conv_id: str | None,
    ctx: "ConversationContext",
) -> ChatResponse:
    """Handle a follow-up question by refining prior results."""
    from backend.chatbot.context_memory import (
        save_context, refine_results, intent_to_topic, result_type_for_intent,
    )
    from backend.models import ConversationContext

    lower = message.lower()
    prior_intent = ctx.last_intent or CivicIntent.GENERAL.value
    prior_topic = ctx.last_topic

    # Special case: "help me report it too" / "report it" follow-up
    if "report" in lower and ("it" in lower or "too" in lower or "also" in lower):
        if prior_topic == "trash":
            answer = (
                "Sure! You can report the missed trash pickup:\n\n"
                "  - Online: montgomeryalabama.gov/311\n"
                "  - Phone: Call 311\n\n"
                "Reports are usually addressed within 1-2 business days."
            )
            intent_val = CivicIntent.REPORT_ISSUE.value
            intent_enum = CivicIntent.REPORT_ISSUE
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
            chips=INTENT_CHIPS.get(intent_enum, INTENT_CHIPS[CivicIntent.GENERAL]),
            suggested_actions=INTENT_ACTIONS.get(intent_enum, []),
            answer_summary="Report via Montgomery 311",
            reasoning_notes=f"Follow-up to {prior_topic} conversation | report request",
            source_count=0,
        )

    # Special case: "check the schedule" follow-up for trash
    if prior_topic == "trash" and ("schedule" in lower or "pickup" in lower):
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
            chips=INTENT_CHIPS[CivicIntent.REPORT_ISSUE],
            suggested_actions=INTENT_ACTIONS[CivicIntent.REPORT_ISSUE],
            answer_summary="Trash pickup schedule",
            reasoning_notes="Follow-up to trash conversation | schedule request",
            source_count=0,
        )

    # Special case: traffic follow-ups ("is it because of events?", "which events?", "road closures?")
    if prior_topic == "traffic":
        return await _handle_traffic_followup(message, conv_id, ctx)

    # Special case: new_resident follow-ups ("I have two kids", "I also need job help")
    if prior_topic == "new_resident":
        return await _handle_new_resident_followup(message, conv_id, ctx)

    # General refinement: filter prior results
    if ctx.last_results:
        refined, filter_desc = refine_results(message, ctx.last_results)

        if refined and (filter_desc or refined != ctx.last_results):
            # Build answer from refined results
            answer = _build_refined_answer(refined, filter_desc, prior_topic, ctx)
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
                chips=INTENT_CHIPS.get(intent_enum, INTENT_CHIPS[CivicIntent.GENERAL]),
                suggested_actions=INTENT_ACTIONS.get(intent_enum, []),
                answer_summary=f"Refined results ({filter_desc})" if filter_desc else "Refined results",
                reasoning_notes=f"Follow-up refinement on {prior_topic} | filter: {filter_desc}",
                source_items=refined,
                source_count=len(refined),
            )

    # Refinement didn't match current results — fall through to normal flow
    # so the user gets a fresh answer (e.g. "family-friendly events" after
    # already filtering to "free events")
    return None


def _get_fallback_answer(intent: CivicIntent) -> str:
    """Short fallback answer when we need a follow-up."""
    fallbacks = {
        CivicIntent.REPORT_ISSUE: "I can help you report that to Montgomery 311.",
        CivicIntent.FIND_SERVICE: "I can help you find city services.",
        CivicIntent.NEIGHBORHOOD_SUMMARY: "I can look up neighborhood info for you.",
    }
    return fallbacks.get(intent, "I'm here to help with Montgomery city services.")


# ── Answer generation ────────────────────────────────────

async def _generate_answer(
    intent: CivicIntent,
    message: str,
    context: str,
    entities: dict,
    sources: list | None = None,
) -> tuple[str, str | None, str | None, list[str]]:
    """Generate answer, reasoning, summary, and warnings.

    Returns (answer, reasoning_notes, answer_summary, warnings).
    """
    provider = get_llm_provider()
    warnings: list[str] = []
    reasoning: str | None = None
    summary: str | None = None

    # Try Gemini first
    from backend.chatbot.llm_provider import MockLLMProvider
    if provider.is_available() and not isinstance(provider, MockLLMProvider):
        prompt = _build_gemini_prompt(intent, message, context, entities)
        llm_answer = await provider.generate(prompt, CIVIC_SYSTEM_PROMPT)
        if llm_answer:
            summary = llm_answer[:80].split(".")[0] + "." if "." in llm_answer[:80] else llm_answer[:80]
            return llm_answer, "Generated via Gemini AI", summary, warnings

    # Fallback: rich template answer
    answer = _build_template_answer(intent, message, entities, sources or [])
    reasoning = _build_reasoning(intent, entities, sources or [])
    summary = _build_summary(intent, entities)

    return answer, reasoning, summary, warnings


def _build_gemini_prompt(
    intent: CivicIntent, message: str, context: str, entities: dict,
) -> str:
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


def _build_reasoning(intent: CivicIntent, entities: dict, sources: list) -> str:
    """Explain why we gave this answer — for transparency."""
    parts = [f"Intent: {intent.value} (deterministic classifier)"]
    if entities:
        parts.append(f"Entities found: {', '.join(f'{k}={v}' for k, v in entities.items())}")
    parts.append(f"Sources consulted: {len(sources)}")
    return " | ".join(parts)


def _build_summary(intent: CivicIntent, entities: dict) -> str:
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


# ── Rich template answers ────────────────────────────────

def _build_template_answer(
    intent: CivicIntent, message: str, entities: dict, sources: list,
) -> str:
    """Build rich template answers covering all test scenarios."""
    from backend.models import SourceItem

    lower = message.lower()

    # ── REPORT_ISSUE (includes trash schedule combo) ─────
    if intent == CivicIntent.REPORT_ISSUE:
        return _answer_report_issue(lower, entities)

    # ── CITY_EVENTS (date-aware, volunteer, family) ──────
    if intent == CivicIntent.CITY_EVENTS:
        return _answer_events(lower, sources)

    # ── FIND_SERVICE (parks, playground, general) ────────
    if intent == CivicIntent.FIND_SERVICE:
        return _answer_find_service(lower, entities, sources)

    # ── TRAFFIC_DISRUPTION (reasoning with confidence) ───
    if intent == CivicIntent.TRAFFIC_DISRUPTION:
        return _answer_traffic(lower, sources)

    # ── NEW_RESIDENT ─────────────────────────────────────
    if intent == CivicIntent.NEW_RESIDENT:
        return _answer_new_resident(lower, entities)

    # ── JOB_LOSS_SUPPORT ─────────────────────────────────
    if intent == CivicIntent.JOB_LOSS_SUPPORT:
        return _answer_job_loss(lower, sources)

    # ── TRENDING_ISSUES ──────────────────────────────────
    if intent == CivicIntent.TRENDING_ISSUES:
        return _answer_trending(sources)

    # ── PUBLIC_SAFETY ────────────────────────────────────
    if intent == CivicIntent.PUBLIC_SAFETY:
        return _answer_public_safety(lower, entities, sources)

    # ── NEIGHBORHOOD_SUMMARY ─────────────────────────────
    if intent == CivicIntent.NEIGHBORHOOD_SUMMARY:
        hood = entities.get("neighborhood", "your area")
        return f"Here's what I know about {hood}. I've highlighted nearby services on the map for you."

    # ── SUGGEST_NEXT_STEP ────────────────────────────────
    if intent == CivicIntent.SUGGEST_NEXT_STEP:
        return (
            "Based on what you've told me, here are some steps I'd recommend. "
            "Let me know which one you'd like to explore first."
        )

    # ── GENERAL fallback (smart reasoning) ─────────────
    return _answer_smart_fallback(lower, entities, sources)


def _answer_report_issue(lower: str, entities: dict) -> str:
    """Handle report_issue including trash schedule combo."""
    # Trash schedule + report combo
    if "trash" in lower and ("schedule" in lower or "pickup" in lower or "collected" in lower or "wasn't" in lower or "not" in lower):
        lines = [
            "Here's your Montgomery trash pickup schedule:",
            "",
            "  North Montgomery: Monday & Thursday",
            "  South Montgomery: Tuesday & Friday",
            "  Downtown: Wednesday",
            "",
        ]
        if "not" in lower or "wasn't" in lower or "missed" in lower:
            lines.append("It sounds like your pickup was missed. You can report it:")
            lines.append("  - Online: montgomeryalabama.gov/311")
            lines.append("  - Phone: Call 311")
            lines.append("")
            lines.append("Reports are usually addressed within 1-2 business days.")
        else:
            lines.append("If your trash wasn't collected on schedule, you can report it via 311.")
        return "\n".join(lines)

    issue = entities.get("issue_type", "").replace("_", " ")
    addr = entities.get("address", "")
    answer = f"I can help you report the {issue} issue" if issue else "I can help you report that issue"
    if addr:
        answer += f" at {addr}"
    answer += "."
    answer += "\n\nMontgomery's 311 system handles civic issues like potholes, streetlights, trash, and flooding."
    answer += "\n\nYou can report online at montgomeryalabama.gov/311 or call 311 directly."
    return answer


def _answer_events(lower: str, sources: list) -> str:
    """Date-aware, volunteer-aware event answers."""
    from backend.models import SourceItem
    from backend.chatbot.date_utils import parse_temporal_intent

    event_sources = [s for s in sources if isinstance(s, SourceItem)]
    non_news_sources = [s for s in event_sources if s.category != "news"]
    date_range = parse_temporal_intent(lower)

    if not non_news_sources:
        if date_range:
            return (
                f"I couldn't find events specifically for {date_range.label}, "
                "but here are some upcoming events in Montgomery you might enjoy. "
                "Check montgomeryalabama.gov/events for the full calendar."
            )
        return "I don't have specific event information right now. Check montgomeryalabama.gov/events for the latest."

    if "volunteer" in lower:
        header = "Here are community and civic events where you can volunteer in Montgomery:"
    elif date_range:
        header = f"Here's what's happening in Montgomery {date_range.label}:"
    elif "free" in lower or "community" in lower:
        header = "Here are free and community events coming up in Montgomery:"
    elif "family" in lower or "kid" in lower:
        header = "Here are some family-friendly events in Montgomery:"
    elif "food" in lower or "market" in lower:
        header = "Here are food and market events in Montgomery:"
    elif "job" in lower or "career" in lower:
        header = "Here are upcoming job and career events in Montgomery:"
    else:
        header = "Here are upcoming events in Montgomery:"

    lines = [header, ""]
    for s in event_sources[:6]:
        if s.category == "news":
            lines.append(f"  📰 {s.title}")
        else:
            lines.append(f"  📅 {s.title} — {s.description}")
    lines.append("")
    lines.append("Visit montgomeryalabama.gov/events for the full calendar.")
    return "\n".join(lines)


def _answer_find_service(lower: str, entities: dict, sources: list) -> str:
    """Handle service search including parks/playgrounds."""
    from backend.models import SourceItem

    service_sources = [s for s in sources if isinstance(s, SourceItem)]
    cat = entities.get("service_category", "service")

    # Parks and playgrounds
    if "park" in lower or "playground" in lower or "trail" in lower:
        lines = ["Here are parks and recreation options in Montgomery:", ""]
        if service_sources:
            for s in service_sources[:4]:
                lines.append(f"  🌳 {s.title}")
                if s.description:
                    lines.append(f"     {s.description[:100]}")
        else:
            lines.append("  🌳 Blount Cultural Park — trails, gardens, and museums")
            lines.append("  🌳 Riverwalk Park — scenic walking trail along the Alabama River")
            lines.append("  🌳 Lagoon Park — playground, golf, and picnic areas")
            lines.append("  🌳 Gateway Park — splash pad and playground")
        lines.append("")
        lines.append("Check montgomeryparks.com for hours and amenities.")
        return "\n".join(lines)

    # Computer access / internet queries
    if "computer" in lower or "internet access" in lower or "wifi" in lower:
        lines = ["Here are places with free computer and internet access in Montgomery:", ""]
        # Add any matched services
        for s in service_sources[:3]:
            lines.append(f"  💻 {s.title}")
            if s.description:
                lines.append(f"     {s.description[:100]}")
            lines.append("")
        # Always include library info (not in gov_services data)
        lines.append("  📚 Montgomery City-County Public Library (main branch)")
        lines.append("     Free computer access, WiFi, printing, and job search help")
        lines.append("     245 High St, Montgomery — 334-240-4300")
        lines.append("")
        lines.append("  📚 Rufus A. Lewis Regional Library")
        lines.append("     Free computers, WiFi, and community programs")
        lines.append("     3095 Mobile Hwy, Montgomery — 334-625-4872")
        lines.append("")
        if "job" in lower or "apply" in lower:
            lines.append("💡 Tip: The Career Center and libraries both offer free help with online job applications.")
        lines.append("")
        lines.append("You can also browse all services in the Services tab.")
        return "\n".join(lines)

    if not service_sources:
        return f"I couldn't find specific {cat} services right now. Try browsing the Services tab or call 311 for help."

    # Compound query detection (e.g. "free computer access to apply for jobs")
    is_compound = len(service_sources) > 1 and any(
        s.category != service_sources[0].category for s in service_sources if hasattr(s, 'category')
    )

    if is_compound:
        header = f"I found {len(service_sources)} resources that can help:"
        lines = [header, ""]
        for s in service_sources[:6]:
            cat_label = (s.category or "").replace("_", " ").title()
            lines.append(f"  {s.title}")
            if s.description:
                lines.append(f"  {s.description[:100]}")
            if cat_label:
                lines.append(f"  📌 Category: {cat_label}")
            lines.append("")
        lines.append("You can also browse all services in the Services tab.")
        return "\n".join(lines)

    header = f"I found {len(service_sources)} {cat} resource{'s' if len(service_sources) != 1 else ''} in Montgomery:"
    lines = [header, ""]
    for s in service_sources[:4]:
        lines.append(f"  {s.title}")
        if s.description:
            lines.append(f"  {s.description[:100]}")
        lines.append("")
    lines.append("You can also browse all services in the Services tab.")
    return "\n".join(lines)


def _answer_traffic(lower: str, sources: list) -> str:
    """Traffic reasoning with confidence and multi-source analysis."""
    from backend.models import SourceItem

    traffic_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "traffic"]
    event_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "event_traffic"]

    lines = ["Here's my traffic analysis for Montgomery:", ""]

    if traffic_sources:
        lines.append("Recent traffic reports:")
        for s in traffic_sources[:3]:
            lines.append(f"  🚧 {s.title}")

    if event_sources:
        lines.append("")
        lines.append("Large events that may affect traffic:")
        for s in event_sources[:3]:
            lines.append(f"  📅 {s.title} — {s.description}")

    if traffic_sources or event_sources:
        # Confidence based on data availability
        confidence = "moderate" if len(traffic_sources) + len(event_sources) >= 3 else "low"
        lines.append("")
        lines.append(f"Confidence: {confidence} (based on {len(traffic_sources)} news reports and {len(event_sources)} upcoming events)")
    else:
        lines.append("No current traffic disruptions found in recent data.")

    lines.append("")
    lines.append("For real-time updates, check ALDOT at algotraffic.com or call 311.")
    return "\n".join(lines)


def _answer_new_resident(lower: str, entities: dict) -> str:
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


def _answer_job_loss(lower: str, sources: list) -> str:
    """Grouped job loss support across multiple categories."""
    from backend.models import SourceItem

    lines = [
        "I'm sorry to hear that. Here are resources organized by what you might need:",
        "",
        "💼 Employment:",
        "  - Alabama Career Center: 334-286-1746",
        "  - File unemployment at labor.alabama.gov",
        "  - WIOA job training programs through AIDT",
        "",
        "🍎 Food Assistance:",
        "  - SNAP benefits: Apply at Montgomery County DHR",
        "  - Montgomery Area Food Bank: 334-263-3784",
        "",
        "🏥 Healthcare:",
        "  - Medicaid enrollment at Montgomery County DHR",
        "  - Community health clinics (sliding scale fees)",
        "",
        "🏠 Housing Help:",
        "  - Emergency rental assistance through Montgomery Housing Authority",
        "  - Section 8 vouchers: 334-206-1800",
        "",
    ]

    # Add job events if available
    event_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "employment_event"]
    if event_sources:
        lines.append("📅 Upcoming Job Events:")
        for s in event_sources[:2]:
            lines.append(f"  - {s.title} — {s.description}")
        lines.append("")

    lines.append("Would you like more details on any of these areas?")
    return "\n".join(lines)


def _answer_trending(sources: list) -> str:
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


def _answer_public_safety(lower: str, entities: dict, sources: list) -> str:
    """Reasoning-based answer for public safety / police activity queries."""
    from backend.models import SourceItem

    hood = entities.get("neighborhood", "the area")
    news_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "public_safety"]
    event_sources = [s for s in sources if isinstance(s, SourceItem) and s.category == "event_safety"]

    lines = [f"There appears to be increased police or emergency activity near {hood} today.", ""]
    lines.append("Possible reasons could include:")

    if event_sources:
        lines.append("  - Traffic control or security for a nearby event:")
        for s in event_sources[:2]:
            lines.append(f"    📅 {s.title} — {s.description}")
    else:
        lines.append("  - Traffic control for an event or public gathering")

    lines.append("  - A public safety incident or investigation")
    lines.append("  - Routine patrol or training exercise")
    lines.append("")

    if news_sources:
        lines.append("Recent safety-related news:")
        for s in news_sources[:3]:
            lines.append(f"  📰 {s.title}")
        lines.append("")

    lines.append("I can help you check:")
    lines.append("  • Downtown events happening today")
    lines.append("  • Current traffic updates")
    lines.append("  • Road closures in the area")
    lines.append("")
    lines.append("For emergencies, call 911. For non-emergencies, call Montgomery PD at 334-625-2831.")
    return "\n".join(lines)


def _answer_smart_fallback(lower: str, entities: dict, sources: list) -> str:
    """Smart fallback that attempts partial reasoning instead of a dead-end."""
    from backend.models import SourceItem

    lines = ["I'm not sure I fully understand your question, but let me try to help.", ""]

    # Attempt to reason about what the user might need
    topic_hints = []
    if any(w in lower for w in ["police", "cop", "siren", "crime", "emergency"]):
        topic_hints.append("public safety")
    if any(w in lower for w in ["traffic", "road", "drive", "congestion"]):
        topic_hints.append("traffic conditions")
    if any(w in lower for w in ["event", "festival", "happening", "weekend"]):
        topic_hints.append("local events")
    if any(w in lower for w in ["job", "work", "career", "employ"]):
        topic_hints.append("employment resources")
    if any(w in lower for w in ["trash", "garbage", "pickup", "sanitation"]):
        topic_hints.append("sanitation services")
    if any(w in lower for w in ["health", "clinic", "doctor", "hospital"]):
        topic_hints.append("healthcare services")

    if topic_hints:
        lines.append(f"It sounds like you might be asking about: {', '.join(topic_hints)}.")
        lines.append("")
        lines.append("Here's what I can help with:")
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
    else:
        lines.append("I can help you with:")
        lines.append("  • Report civic issues (potholes, streetlights, trash)")
        lines.append("  • Find city services (healthcare, childcare, food assistance)")
        lines.append("  • Check upcoming events and activities")
        lines.append("  • Get traffic and road closure updates")
        lines.append("  • Explore resources for new residents or job seekers")

    lines.append("")
    lines.append("Could you rephrase your question or pick one of the suggestions below?")
    return "\n".join(lines)


# ── Follow-up helpers ────────────────────────────────────

async def _handle_traffic_followup(
    message: str, conv_id: str | None, ctx: "ConversationContext",
) -> ChatResponse:
    """Handle traffic-related follow-ups like 'is it because of events?'"""
    from backend.chatbot.context_memory import save_context
    from backend.models import ConversationContext

    lower = message.lower()

    if "event" in lower or "because" in lower:
        # Show events that could cause traffic
        event_items = [r for r in ctx.last_results if r.get("category") == "event_traffic"]
        if event_items:
            lines = ["Yes, these large upcoming events could be contributing to traffic:", ""]
            for e in event_items[:4]:
                lines.append(f"  📅 {e.get('title', '')} — {e.get('description', '')}")
            lines.append("")
            lines.append("Large events often require road closures and traffic control.")
        else:
            lines = [
                "It's possible — large events often cause traffic congestion in Montgomery.",
                "I don't have specific event-related traffic data right now,",
                "but you can check montgomeryalabama.gov/events for today's schedule.",
            ]
        answer = "\n".join(lines)
    elif "road closure" in lower or "closure" in lower or "closed" in lower:
        traffic_items = [r for r in ctx.last_results if r.get("category") == "traffic"]
        if traffic_items:
            lines = ["Here are recent road and construction reports:", ""]
            for t in traffic_items[:4]:
                lines.append(f"  🚧 {t.get('title', '')}")
            lines.append("")
            lines.append("For real-time closures, check ALDOT at algotraffic.com.")
        else:
            lines = [
                "I don't have specific road closure data right now.",
                "Check ALDOT at algotraffic.com for real-time road closure information.",
            ]
        answer = "\n".join(lines)
    else:
        answer = (
            "I can help you dig deeper into the traffic situation. "
            "Would you like to check:\n"
            "  • Upcoming events that may cause congestion\n"
            "  • Road closures and construction\n"
            "  • Alternative routes"
        )

    save_context(conv_id, CivicIntent.TRAFFIC_DISRUPTION.value, message,
                 ctx.last_results, ctx.last_entities, "traffic", "traffic_info")
    return ChatResponse(
        intent=CivicIntent.TRAFFIC_DISRUPTION.value, answer=answer, confidence=0.75,
        extracted_entities=ctx.last_entities,
        chips=["Which events?", "Road closures?", "Alternative routes"],
        suggested_actions=INTENT_ACTIONS[CivicIntent.TRAFFIC_DISRUPTION],
        answer_summary="Traffic follow-up",
        reasoning_notes=f"Follow-up to traffic conversation | turn {ctx.turn_count + 1}",
        source_count=len(ctx.last_results),
    )


async def _handle_new_resident_followup(
    message: str, conv_id: str | None, ctx: "ConversationContext",
) -> ChatResponse:
    """Handle new resident follow-ups like 'I have two kids' or 'I also need job help'."""
    from backend.chatbot.context_memory import save_context
    from backend.models import ConversationContext

    lower = message.lower()
    lines = []

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
    elif "job" in lower or "work" in lower or "career" in lower or "employ" in lower:
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
    else:
        lines = [
            "Thanks for sharing! I can help you find specific services.",
            "What are you looking for? For example:",
            "  • Schools and childcare",
            "  • Job search help",
            "  • Healthcare",
            "  • Housing assistance",
        ]

    answer = "\n".join(lines)
    save_context(conv_id, CivicIntent.NEW_RESIDENT.value, message,
                 ctx.last_results, ctx.last_entities, "new_resident", "onboarding_info")
    return ChatResponse(
        intent=CivicIntent.NEW_RESIDENT.value, answer=answer, confidence=0.75,
        extracted_entities=ctx.last_entities,
        chips=["Schools nearby", "Childcare options", "Job help", "Healthcare"],
        suggested_actions=INTENT_ACTIONS[CivicIntent.NEW_RESIDENT],
        answer_summary="New resident follow-up",
        reasoning_notes=f"Follow-up to new_resident conversation | turn {ctx.turn_count + 1}",
        source_count=0,
    )


def _build_refined_answer(
    refined: list[dict], filter_desc: str, topic: str, ctx: "ConversationContext",
) -> str:
    """Build an answer from refined/filtered prior results."""
    from backend.models import ConversationContext

    count = len(refined)
    topic_label = _topic_label(topic)

    if filter_desc:
        header = f"From the previous {topic_label}, here are the ones matching '{filter_desc}' ({count} result{'s' if count != 1 else ''}):"
    else:
        header = f"Here are the refined {topic_label} ({count} result{'s' if count != 1 else ''}):"

    lines = [header, ""]
    for item in refined[:6]:
        title = item.get("title", "")
        desc = item.get("description", "")
        if topic == "events":
            lines.append(f"  📅 {title} — {desc}")
        elif topic == "services" or topic == "jobs":
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


def _topic_label(topic: str) -> str:
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
