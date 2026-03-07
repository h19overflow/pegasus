"""Lightweight conversation context memory.

Stores per-session context in an in-memory dict keyed by conversation_id.
Supports follow-up detection, context resolution, and topic switching.
No database, no long-term memory — just enough for multi-turn chat.
"""

from __future__ import annotations

import re
import time
from typing import Any

from backend.models import ConversationContext, CivicIntent, SourceItem
from backend.chatbot.context_constants import (
    FOLLOWUP_PATTERNS,
    TOPIC_SWITCH_SIGNALS,
    TOPIC_CONTINUATIONS,
    FOLLOWUP_CUE_PATTERNS,
    MAX_SESSIONS,
    SESSION_TTL,
    INTENT_TO_TOPIC,
    INTENT_TO_RESULT_TYPE,
)

# ── In-memory session store ──────────────────────────────

_sessions: dict[str, ConversationContext] = {}
_session_timestamps: dict[str, float] = {}


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
    expired = [k for k, ts in _session_timestamps.items() if now - ts > SESSION_TTL]
    for k in expired:
        _sessions.pop(k, None)
        _session_timestamps.pop(k, None)
    # Cap total sessions
    if len(_sessions) > MAX_SESSIONS:
        oldest = sorted(_session_timestamps, key=_session_timestamps.get)[:50]  # type: ignore
        for k in oldest:
            _sessions.pop(k, None)
            _session_timestamps.pop(k, None)


# ── Follow-up detection ──────────────────────────────────


def detect_followup(message: str, ctx: ConversationContext | None) -> bool:
    """Return True if the message looks like a follow-up to prior context."""
    if not ctx or ctx.turn_count == 0:
        return False

    lower = message.lower().strip()

    for pattern in FOLLOWUP_PATTERNS:
        if re.search(pattern, lower):
            return True

    # Topic-continuation heuristic: short message that references the prior topic
    words = lower.split()
    if len(words) <= 10 and ctx.last_topic:
        continuations = TOPIC_CONTINUATIONS.get(ctx.last_topic, [])
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
    words = lower.split()
    if len(words) <= 12:
        has_followup_cue = any(re.search(p, lower) for p in FOLLOWUP_CUE_PATTERNS)
        if has_followup_cue:
            return False

    for topic, keywords in TOPIC_SWITCH_SIGNALS.items():
        if topic == current_topic:
            continue
        if any(kw in lower for kw in keywords):
            return True

    return False


# ── Context-aware result filtering ───────────────────────


def _text_match(item: dict, *terms: str) -> bool:
    """Check if any term appears in the item's title, description, or category."""
    blob = " ".join([
        item.get("title", ""),
        item.get("description", ""),
        item.get("category", ""),
    ]).lower()
    return any(t in blob for t in terms)


REFINEMENT_FILTERS: list[tuple[str, str, Any]] = [
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
            if candidate:
                filtered = candidate
                applied_filters.append(pattern.replace(r"\b", "").replace("\\b", "").split("|")[0].strip())

    description = ", ".join(applied_filters) if applied_filters else ""
    return filtered, description


def intent_to_topic(intent: str) -> str:
    """Map a CivicIntent value to a topic string for context tracking."""
    return INTENT_TO_TOPIC.get(intent, "general")


def result_type_for_intent(intent: str) -> str:
    """Map intent to a result_type label."""
    return INTENT_TO_RESULT_TYPE.get(intent, "general_info")
