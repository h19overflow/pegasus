"""Follow-up question logic.

Checks which entities are required for each intent and generates
a follow-up question if any are missing.
"""

from __future__ import annotations

from backend.models import CivicIntent, ExtractedEntities

# Required entities per intent. If any are missing, we ask.
REQUIRED_ENTITIES: dict[CivicIntent, list[str]] = {
    CivicIntent.REPORT_ISSUE: ["issue_type", "address"],
    CivicIntent.FIND_SERVICE: ["service_category"],
    CivicIntent.CITY_EVENTS: [],
    CivicIntent.TRAFFIC_DISRUPTION: [],
    CivicIntent.NEIGHBORHOOD_SUMMARY: ["neighborhood"],
    CivicIntent.SUGGEST_NEXT_STEP: [],
    CivicIntent.NEW_RESIDENT: [],
    CivicIntent.JOB_LOSS_SUPPORT: [],
    CivicIntent.TRENDING_ISSUES: [],
    CivicIntent.PUBLIC_SAFETY: [],
    CivicIntent.GENERAL: [],
}

FOLLOW_UP_TEMPLATES: dict[str, str] = {
    "issue_type": "What type of issue are you reporting? For example: pothole, streetlight out, trash, flooding, or graffiti.",
    "address": "Can you share the address or nearest intersection where this issue is located?",
    "service_category": "What type of service are you looking for? For example: healthcare, childcare, food assistance, housing, or job training.",
    "neighborhood": "Which neighborhood or ZIP code are you asking about?",
}


def check_followup(
    intent: CivicIntent,
    entities: ExtractedEntities,
) -> str | None:
    """Return a follow-up question if required entities are missing, else None.

    Skips follow-up for combo queries (e.g. trash schedule + report)
    where the user is asking about a schedule, not just reporting.
    """
    required = REQUIRED_ENTITIES.get(intent, [])
    if not required:
        return None

    entity_dict = {
        "address": entities.address,
        "issue_type": entities.issue_type,
        "service_category": entities.service_category,
        "neighborhood": entities.neighborhood,
        "event_name": entities.event_name,
        "date_time": entities.date_time,
    }

    # For report_issue with trash schedule queries, skip address requirement
    if intent == CivicIntent.REPORT_ISSUE and entity_dict.get("issue_type") == "trash":
        required = [r for r in required if r != "address"]

    for field_name in required:
        if not entity_dict.get(field_name):
            return FOLLOW_UP_TEMPLATES.get(field_name)

    return None
