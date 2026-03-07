"""Static constants for the chatbot responder — chips, actions, and system prompt."""

from backend.models import CivicIntent

CIVIC_SYSTEM_PROMPT = """You are a helpful civic assistant for the City of Montgomery, Alabama.
Your role is to help citizens with city services, issue reporting, events, and neighborhood information.
Be concise, friendly, and actionable. Always suggest concrete next steps.
If you reference a service or resource, include its name and how to access it.
Keep responses under 150 words. Use plain language accessible to all reading levels."""

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
