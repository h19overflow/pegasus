"""Constants for conversation context memory — follow-up detection and refinement."""

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

# Per-topic continuation keywords for short follow-up messages
TOPIC_CONTINUATIONS: dict[str, list[str]] = {
    "trash": ["schedule", "pickup", "collected", "report", "missed"],
    "traffic": ["because", "event", "closure", "route", "alternative"],
    "events": ["free", "family", "kid", "downtown", "closest", "nearest"],
    "services": ["computer", "resume", "training", "near me"],
    "safety": ["event", "cause", "reason", "report"],
}

# Cue patterns that suppress topic-switch detection for short messages
FOLLOWUP_CUE_PATTERNS: list[str] = [
    r"\bis\s+it\b", r"\bbecause\b", r"\bwhy\b", r"\bwhich\b",
    r"\bwhat\s+about\b", r"\bcan\s+you\b", r"\bshow\s+me\b",
    r"\btell\s+me\b", r"\bany\s+of\b",
]

# Session store limits
MAX_SESSIONS = 200
SESSION_TTL = 1800  # 30 minutes

# Intent → topic mapping
INTENT_TO_TOPIC: dict[str, str] = {
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

# Intent → result type mapping
INTENT_TO_RESULT_TYPE: dict[str, str] = {
    "city_events": "event_list",
    "find_service": "service_list",
    "report_issue": "report_info",
    "traffic_or_disruption_reason": "traffic_info",
    "public_safety": "safety_info",
    "job_loss_support": "service_list",
    "new_resident": "onboarding_info",
    "trending_issues": "trend_list",
}
