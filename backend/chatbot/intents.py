"""Deterministic intent classifier for civic queries.

Uses keyword/pattern matching. No LLM needed — fast and explainable.
"""

from __future__ import annotations

import re
from backend.models import CivicIntent

# Each intent maps to (keywords, boost_patterns) where boost_patterns
# are regex that strongly indicate the intent.
INTENT_RULES: list[tuple[CivicIntent, list[str], list[str]]] = [
    (
        CivicIntent.REPORT_ISSUE,
        ["report", "pothole", "broken", "streetlight", "graffiti",
         "complaint", "damaged", "flooding", "sewer", "water main",
         "abandoned", "noise", "illegal dumping", "stray",
         "trash wasn't picked up", "trash not collected", "missed pickup",
         "trash was not picked up", "trash not picked up",
         "trash schedule", "garbage schedule", "pickup schedule"],
        [r"\breport\b", r"\bfile\s+a\b", r"\bcomplain", r"\btrash\b.*\b(schedule|picked|collect|not)"],
    ),
    (
        CivicIntent.TRAFFIC_DISRUPTION,
        ["traffic", "road closed", "construction", "detour", "accident",
         "congestion", "disruption", "closure", "blocked", "delay",
         "why is traffic"],
        [r"\btraffic\b", r"\broad\s+clos", r"\bdetour\b", r"\bwhy\s+is\s+traffic\b"],
    ),
    (
        CivicIntent.CITY_EVENTS,
        ["event", "festival", "concert", "parade", "fair", "celebration",
         "fireworks", "market", "workshop", "community event", "happening",
         "activities", "family-friendly", "things to do", "fun", "weekend",
         "volunteer", "volunteering"],
        [r"\bevent", r"\bfestival\b", r"\bwhat.*happening\b", r"\bactivit",
         r"\bvolunteer"],
    ),
    (
        CivicIntent.FIND_SERVICE,
        ["find", "where", "nearest", "show", "locate", "look up",
         "clinic", "hospital", "library", "libraries",
         "childcare", "daycare", "child care",
         "school", "shelter", "food bank",
         "medicaid", "snap", "benefits", "apply", "help me",
         "how do i", "dhr", "wic", "park", "parks", "playground", "trail",
         "walking trail", "recreation", "computer access", "free computer",
         "internet access", "wifi",
         "healthcare", "health care", "education",
         "community center", "safety", "fire station",
         "police station"],
        [r"\bfind\b", r"\bwhere\s+(can|is|do|are)\b", r"\bnearest\b",
         r"\bshow\s+(me\s+)?\w+\s+(near|around|in)\b",
         r"\bhow\s+do\s+i\b", r"\bpark.*(playground|trail)", r"\bplayground",
         r"\bcomputer\s+access\b", r"\bfree\s+computer\b",
         r"\blibraries?\s+(near|around|in)\b",
         r"\b(healthcare|childcare|education|safety)\s+(near|around|in|options)\b"],
    ),
    (
        CivicIntent.NEW_RESIDENT,
        ["just moved", "new to montgomery", "new resident", "moved here",
         "recently moved", "new in town", "just arrived", "relocat",
         "what city services", "getting started", "new here"],
        [r"\b(just|recently)\s+(moved|arrived)\b", r"\bnew\s+(to|in)\s+montgomery\b",
         r"\bnew\s+resident\b"],
    ),
    (
        CivicIntent.JOB_LOSS_SUPPORT,
        ["lost my job", "lost job", "laid off", "unemployed", "job loss",
         "fired", "let go", "downsized", "need work", "no income",
         "help someone who lost", "services for unemployed",
         "got laid off", "just got laid off",
         "lost their job", "services help someone who lost"],
        [r"\blost\s+(my\s+|their\s+)?job\b", r"\blaid\s+off\b", r"\bunemploy",
         r"\bjob\s+loss\b", r"\bgot\s+laid\s+off\b", r"\b(fired|let\s+go|downsized)\b",
         r"\bservices?\s+help\s+someone\s+who\s+lost\b"],
    ),
    (
        CivicIntent.TRENDING_ISSUES,
        ["trending", "biggest issues", "community issues", "people reporting",
         "most reported", "common complaints", "what are people",
         "top issues", "rising issues"],
        [r"\btrending\b", r"\bbiggest\s+(community\s+)?issue", r"\bpeople\s+(are\s+)?report",
         r"\bmost\s+reported\b"],
    ),
    (
        CivicIntent.PUBLIC_SAFETY,
        ["police", "police cars", "cop", "cops", "sirens", "siren",
         "crime", "shooting", "investigation", "incident", "emergency",
         "ambulance", "fire truck", "swat", "arrest", "robbery",
         "break-in", "assault", "suspicious", "gunshot", "stabbing"],
        [r"\bpolice\b", r"\bcops?\b", r"\bsiren", r"\bcrime\b",
         r"\bshooting\b", r"\bemergency\b", r"\bincident\b",
         r"\bwhy\s+(are|is)\s+there\s+(so\s+many\s+)?police\b"],
    ),
    (
        CivicIntent.NEIGHBORHOOD_SUMMARY,
        ["neighborhood", "area", "zip code", "zone", "district",
         "what's it like", "safe", "crime rate", "schools in"],
        [r"\bneighborhood\b", r"\bzip\s*code\b", r"\b\d{5}\b"],
    ),
    (
        CivicIntent.SUGGEST_NEXT_STEP,
        ["what should i", "next step", "recommend", "suggest", "what now",
         "help me decide", "what do you think", "advice"],
        [r"\bwhat\s+should\b", r"\bnext\s+step\b", r"\brecommend\b"],
    ),
]


def classify_intent(message: str) -> tuple[CivicIntent, float]:
    """Classify user message into a civic intent with confidence score.

    Returns (intent, confidence) where confidence is 0.0-1.0.
    More specific intents get a small priority boost to win ties.
    """
    lower = message.lower().strip()
    scores: dict[CivicIntent, float] = {}

    # Specific intents get a small boost to win over generic ones
    SPECIFICITY_BOOST: dict[CivicIntent, float] = {
        CivicIntent.JOB_LOSS_SUPPORT: 0.15,
        CivicIntent.NEW_RESIDENT: 0.1,
        CivicIntent.TRENDING_ISSUES: 0.05,
        CivicIntent.PUBLIC_SAFETY: 0.15,
        CivicIntent.REPORT_ISSUE: 0.05,
    }

    for intent, keywords, patterns in INTENT_RULES:
        score = 0.0

        # Keyword hits
        keyword_hits = sum(1 for kw in keywords if kw in lower)
        score += min(keyword_hits * 0.15, 0.6)

        # Pattern boosts
        pattern_hits = sum(1 for p in patterns if re.search(p, lower))
        score += min(pattern_hits * 0.25, 0.5)

        # Specificity boost
        score += SPECIFICITY_BOOST.get(intent, 0.0) if score > 0 else 0.0

        if score > 0:
            scores[intent] = score

    if not scores:
        return CivicIntent.GENERAL, 0.3

    best_intent = max(scores, key=scores.get)  # type: ignore[arg-type]
    confidence = min(scores[best_intent], 0.95)

    return best_intent, round(confidence, 2)
