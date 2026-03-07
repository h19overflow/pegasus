"""Lightweight conversation context memory.

Stores per-session context in an in-memory dict keyed by conversation_id.
Supports follow-up detection, context resolution, and topic switching.
No database, no long-term memory — just enough for multi-turn chat.
"""

from __future__ import annotations

import re
import time
from typing import Any

from scripts.models import ConversationContext, CivicIntent, SourceItem

# ── In-memory session store ──────────────────────────────

_sessions: dict[str, ConversationContext] = {}
_session_timestamps: dict[str, float] = {}
_MAX_SESSIONS = 200
_SESSION_TTL = 1800  # 30 minutes


def get_context(conversation_id: str | None) -> ConversationContext | None:
    """Retrieve session context. Returns None if no session exists."""
    if not conversation_id:
        return None
    _cleanup_stale()
    return _sessions.get(conversation_id)


def save_context(
    conversation_id: str | None,
    intent: str,
    question: str,
    results: list[dict[str, Any]],
    entities: dict[str, Any],
    topic: str,
    result_type: str,
    filters: dict[str, str] | None = None,
) -> None:
    """Store context after a successful answer."""
    if not conversation_id:
        return
    existing = _sessions.get(conversation_id)
    turn = (existing.turn_count + 1) if existing else 1

    _sessions[conversation_id] = ConversationContext(
        last_intent=intent,
        last_question=question,
        last_results=results,
        last_entities=entities,
        last_filters=filters or {},
        last_topic=topic,
        last_result_type=result_type,
        turn_count=turn,
    )
    _session_timestamps[conversation_id] = time.time()


def clear_context(conversation_id: str | None) -> None:
    """Explicitly clear a session."""
    if conversation_id and conversation_id in _sessions:
        del _sessions[conversation_id]
        _session_timestamps.pop(conversation_id, None)


def _cleanup_stale() -> None:
    """Evict expired sessions."""
    now = time.time()
    expired = [k for k, ts in _session_timestamps.items() if now - ts > _SESSION_TTL]
    for k in expired:
        _sessions.pop(k, None)
        _session_timestamps.pop(k, None)
    # Cap total sessions
    if len(_sessions) > _MAX_SESSIONS:
        oldest = sorted(_session_timestamps, key=_session_timestamps.get)[:50]  # type: ignore
        for k in oldest:
            _sessions.pop(k, None)
            _session_timestamps.pop(k, None)


# ── Follow-up detection ──────────────────────────────────

# Phrases that strongly indicate a follow-up referencing prior results
FOLLOWUP_PATTERNS = [
    r"\b(those|them|that|these|ones)\b",
    r"\bwhich\s+(ones?|of|are)\b",
    r"\bfrom\s+(the|that)\s+(list|results?)\b",
    r"\bthe\s+(free|family|closest|nearest|cheapest|best)\s+ones?\b",
    r"\bcan\s+you\s+also\b",
    r"\bwhat\s+about\b",
    r"\band\s+which\b",
    r"\bare\s+any\s+of\s+(them|those)\b",
    r"\bshow\s+(me\s+)?(only|just)\b",
    r"\bnarrow\s+(it|them)\s+down\b",
    r"\bhelp\s+me\s+report\s+it\b",
    r"\breport\s+it\s+(too|also)\b",
    r"\bis\s+it\s+because\b",
    r"\bi\s+(also|have|need)\b",
    r"\bany\s+(that|of|with)\b",
]

# Topic keywords that indicate a clear topic switch (not a follow-up)
TOPIC_SWITCH_SIGNALS: dict[str, list[str]] = {
    "events": ["event", "festival", "happening", "weekend activities"],
    "services": ["service", "help me find", "where can i"],
    "traffic": ["traffic", "road closed", "construction"],
    "safety": ["police", "crime", "emergency", "siren"],
    "trash": ["trash", "garbage", "pickup", "sanitation"],
    "jobs": ["lost my job", "laid off", "unemployed", "job loss"],
    "new_resident": ["just moved", "new to montgomery", "new resident"],
    "trending": ["trending", "biggest issues", "people reporting"],
}


def detect_followup(message: str, ctx: ConversationContext | None) -> bool:
    """Return True if the message looks like a follow-up to prior context."""
    if not ctx or ctx.turn_count == 0:
        return False

    lower = message.lower().strip()

    # Check explicit follow-up patterns first
    for pattern in FOLLOWUP_PATTERNS:
        if re.search(pattern, lower):
            return True

    # Topic-continuation heuristic: short message that references the prior topic
    # e.g. "check the schedule" after talking about trash
    words = lower.split()
    if len(words) <= 10 and ctx.last_topic:
        topic_continuations: dict[str, list[str]] = {
            "trash": ["schedule", "pickup", "collected", "report", "missed"],
            "traffic": ["because", "event", "closure", "route", "alternative"],
            "events": ["free", "family", "kid", "downtown", "closest", "nearest"],
            "services": ["computer", "resume", "training", "near me"],
            "safety": ["event", "cause", "reason", "report"],
        }
        continuations = topic_continuations.get(ctx.last_topic, [])
        if any(c in lower for c in continuations):
            return True

    return False


def detect_topic_switch(message: str, ctx: ConversationContext | None) -> bool:
    """Return True if the user is clearly switching to a new topic."""
    if not ctx or ctx.turn_count == 0:
        return False

    lower = message.lower()
    current_topic = ctx.last_topic

    # Short messages with follow-up cues should NOT be treated as topic switches
    # e.g. "Is it because of events?" during a traffic conversation
    followup_cues = [
        r"\bis\s+it\b", r"\bbecause\b", r"\bwhy\b", r"\bwhich\b",
        r"\bwhat\s+about\b", r"\bcan\s+you\b", r"\bshow\s+me\b",
        r"\btell\s+me\b", r"\bany\s+of\b",
    ]
    words = lower.split()
    if len(words) <= 12:
        has_followup_cue = any(re.search(p, lower) for p in followup_cues)
        if has_followup_cue:
            return False

    for topic, keywords in TOPIC_SWITCH_SIGNALS.items():
        if topic == current_topic:
            continue
        if any(kw in lower for kw in keywords):
            # Strong signal for a different topic
            return True

    return False


# ── Context-aware result filtering ───────────────────────

# Refinement keywords that map to filter operations on prior results
def _text_match(item: dict, *terms: str) -> bool:
    """Check if any term appears in the item's title, description, or category."""
    blob = " ".join([
        item.get("title", ""),
        item.get("description", ""),
        item.get("category", ""),
    ]).lower()
    return any(t in blob for t in terms)


REFINEMENT_FILTERS: list[tuple[str, str, Any]] = [
    # (keyword_pattern, filter_field, filter_logic)
    # For events:
    (r"\bfree\b", "category", lambda items: [
        i for i in items if _text_match(i, "free", "community", "civic", "no cost", "no charge")
    ]),
    (r"\bfamily[\s-]?friendly\b|\bfamily\b|\bkid|\bchildren\b", "category", lambda items: [
        i for i in items if _text_match(i, "family", "kid", "children", "child", "youth",
                                         "community", "sports", "festival", "fun", "playground")
    ]),
    (r"\bdowntown\b|\bclosest\s+to\s+downtown\b|\bnear\s+downtown\b", "neighborhood", lambda items: [
        i for i in items if _text_match(i, "downtown", "dexter", "court square",
                                         "commerce st", "washington park", "riverfront")
    ]),
    # For services:
    (r"\bcomputer\s+access\b|\bfree\s+computer\b|\bcomputer\b", "description", lambda items: [
        i for i in items if _text_match(i, "computer", "internet", "wifi", "wi-fi")
    ]),
    (r"\bresumes?\b|\bresumé\b", "description", lambda items: [
        i for i in items if _text_match(i, "resume", "résumé", "career", "job search", "employment")
    ]),
    (r"\bjob\s+training\b|\btraining\b", "description", lambda items: [
        i for i in items if _text_match(i, "training", "workforce", "wioa", "skill")
    ]),
]


def refine_results(
    message: str,
    prior_results: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str]:
    """Apply refinement filters to prior results based on the follow-up message.

    Returns (filtered_results, filter_description).
    If no explicit filter matches but the message is a clear follow-up,
    returns the original results unchanged so the caller can still respond.
    """
    lower = message.lower()
    filtered = prior_results
    applied_filters: list[str] = []

    for pattern, _field, filter_fn in REFINEMENT_FILTERS:
        if re.search(pattern, lower):
            candidate = filter_fn(filtered)
            if candidate:  # only apply if it doesn't empty the list
                filtered = candidate
                applied_filters.append(pattern.replace(r"\b", "").replace("\\b", "").split("|")[0].strip())

    description = ", ".join(applied_filters) if applied_filters else ""
    return filtered, description


def intent_to_topic(intent: str) -> str:
    """Map a CivicIntent value to a topic string for context tracking."""
    mapping = {
        "city_events": "events",
        "find_service": "services",
        "report_issue": "trash",
        "traffic_or_disruption_reason": "traffic",
        "public_safety": "safety",
        "job_loss_support": "jobs",
        "new_resident": "new_resident",
        "trending_issues": "trending",
        "neighborhood_summary": "neighborhood",
        "suggest_next_step": "services",
        "general": "general",
    }
    return mapping.get(intent, "general")


def result_type_for_intent(intent: str) -> str:
    """Map intent to a result_type label."""
    mapping = {
        "city_events": "event_list",
        "find_service": "service_list",
        "report_issue": "report_info",
        "traffic_or_disruption_reason": "traffic_info",
        "public_safety": "safety_info",
        "job_loss_support": "service_list",
        "new_resident": "onboarding_info",
        "trending_issues": "trend_list",
    }
    return mapping.get(intent, "general_info")
