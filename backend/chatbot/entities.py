"""Regex-based entity extractor for civic queries.

Extracts: address, issue_type, event_name, neighborhood,
service_category, date_time. Also detects temporal intent and
multi-category queries.
"""

from __future__ import annotations

import re
from backend.models import ExtractedEntities
from backend.chatbot.date_utils import parse_temporal_intent, DateRange

# Montgomery AL neighborhoods
NEIGHBORHOODS = [
    "capitol heights", "cloverdale", "garden district", "midtown",
    "old cloverdale", "pike road", "dalraida", "chisholm",
    "arrowhead", "bell road", "carter hill", "centennial hill",
    "cottage hill", "highland park", "mcgehee", "normandale",
    "perry hill", "ridgecrest", "vaughn park", "woodley park",
    "downtown", "east montgomery", "west montgomery",
    "north montgomery", "south montgomery",
]

ISSUE_TYPES = {
    "pothole": ["pothole", "pot hole", "road damage"],
    "streetlight": ["streetlight", "street light", "light out", "dark street"],
    "trash": ["trash", "garbage", "litter", "illegal dumping", "waste"],
    "flooding": ["flooding", "flood", "standing water", "drainage"],
    "graffiti": ["graffiti", "vandalism", "spray paint"],
    "sewer": ["sewer", "sewage", "water main", "pipe break"],
    "noise": ["noise", "loud", "noise complaint"],
    "abandoned_vehicle": ["abandoned car", "abandoned vehicle"],
    "sidewalk": ["sidewalk", "cracked sidewalk", "broken sidewalk"],
    "traffic_signal": ["traffic light", "signal", "stop sign"],
}

SERVICE_CATEGORIES = {
    "health": ["health", "healthcare", "health care", "hospital", "clinic", "medical", "doctor", "medicaid", "medicare"],
    "childcare": ["childcare", "child care", "daycare", "day care", "babysit", "preschool"],
    "education": ["school", "education", "college", "training", "ged", "wioa"],
    "food": ["food", "snap", "food bank", "food stamp", "wic", "pantry"],
    "housing": ["housing", "shelter", "rent", "homeless", "section 8"],
    "employment": ["job", "employment", "career", "hiring", "work"],
    "legal": ["legal", "lawyer", "court", "expungement"],
    "transportation": ["bus", "transit", "ride", "transportation"],
    "libraries": ["library", "libraries", "computer", "wifi", "internet"],
    "community": ["community center", "recreation center", "community", "recreation", "program"],
    "parks": ["park", "parks", "playground", "trail", "walking trail", "recreation area", "green space"],
    "safety": ["fire station", "fire department", "fire safety"],
    "police": ["police station", "police department", "precinct"],
}


def extract_entities(message: str) -> ExtractedEntities:
    """Extract civic entities from a user message."""
    lower = message.lower()
    entities = ExtractedEntities()

    # Address: look for street number + street name patterns
    addr_match = re.search(
        r"\b(\d{1,5}\s+(?:[NSEW]\.?\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*"
        r"\s+(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|way|pl|place))\b",
        message, re.IGNORECASE,
    )
    if addr_match:
        entities.address = addr_match.group(1).strip()

    # Neighborhood
    for hood in NEIGHBORHOODS:
        if hood in lower:
            entities.neighborhood = hood.title()
            break

    # ZIP code as neighborhood fallback
    if not entities.neighborhood:
        zip_match = re.search(r"\b(361\d{2})\b", message)
        if zip_match:
            entities.neighborhood = f"ZIP {zip_match.group(1)}"

    # Issue type
    for issue_key, keywords in ISSUE_TYPES.items():
        if any(kw in lower for kw in keywords):
            entities.issue_type = issue_key
            break

    # Service category
    for cat_key, keywords in SERVICE_CATEGORIES.items():
        if any(kw in lower for kw in keywords):
            entities.service_category = cat_key
            break

    # Date/time — use temporal parser for structured range, fall back to regex
    temporal = parse_temporal_intent(message)
    if temporal:
        entities.date_time = temporal.label
    else:
        date_match = re.search(
            r"\b(today|tomorrow|yesterday|this week|next week|monday|tuesday|"
            r"wednesday|thursday|friday|saturday|sunday|"
            r"\d{1,2}/\d{1,2}(?:/\d{2,4})?|"
            r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})\b",
            lower,
        )
        if date_match:
            entities.date_time = date_match.group(1)

    # Event name: quoted text or "the <Name>" pattern
    event_match = re.search(r'"([^"]+)"', message)
    if event_match:
        entities.event_name = event_match.group(1)
    else:
        event_match = re.search(r"\bthe\s+([A-Z][A-Za-z\s]+(?:Festival|Fair|Parade|Concert|Market|Event))", message)
        if event_match:
            entities.event_name = event_match.group(1).strip()

    return entities


def detect_multi_categories(message: str) -> list[str]:
    """Detect multiple service categories mentioned in a single query.

    Useful for compound queries like job loss support which spans
    employment + food + housing + health.
    """
    lower = message.lower()
    found: list[str] = []
    for cat_key, keywords in SERVICE_CATEGORIES.items():
        if any(kw in lower for kw in keywords):
            found.append(cat_key)
    return found
