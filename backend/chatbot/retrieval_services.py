"""Service and report retrieval for the civic chatbot."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from backend.models import SourceItem, MapHighlight, ExtractedEntities

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Categories that exist on the frontend map (loaded from ArcGIS) but not in
# gov_services.json. When the user asks about these, we return synthetic
# sources so the responder knows the data exists.
_MAP_CATEGORY_INFO: dict[str, dict[str, str]] = {
    "libraries": {
        "label": "Libraries",
        "description": "Public library branches with free computer access, WiFi, printing, and community programs",
        "note": "Montgomery City-County Public Library system",
    },
    "parks": {
        "label": "Parks & Recreation",
        "description": "City parks, playgrounds, trails, and recreation areas",
        "note": "Montgomery Parks & Recreation Department",
    },
    "safety": {
        "label": "Fire & Safety",
        "description": "Fire stations and emergency services across Montgomery",
        "note": "Montgomery Fire/Rescue Department",
    },
    "police": {
        "label": "Police Facilities",
        "description": "Police stations, precincts, and public safety offices",
        "note": "Montgomery Police Department",
    },
    "community": {
        "label": "Community Centers",
        "description": "Community centers offering programs, workshops, and resources",
        "note": "Montgomery community services",
    },
    "health": {
        "label": "Healthcare Facilities",
        "description": "Hospitals, clinics, and healthcare providers in Montgomery",
        "note": "Montgomery healthcare network",
    },
    "childcare": {
        "label": "Childcare Centers",
        "description": "Licensed daycare centers and preschool programs",
        "note": "Montgomery childcare providers",
    },
    "education": {
        "label": "Education Facilities",
        "description": "Schools, colleges, and training centers in Montgomery",
        "note": "Montgomery education system",
    },
}


def retrieve_services(
    entities: ExtractedEntities,
    message: str,
    get_gov_services: object,
    get_civic_points: object,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Find matching government services. Handles compound queries."""
    from backend.chatbot.entities import detect_multi_categories

    services = get_gov_services()
    multi_cats = detect_multi_categories(message)

    if len(multi_cats) > 1:
        sources = retrieve_services_multi(multi_cats, get_gov_services)
        context = _build_multi_category_context(sources)
        return sources, [], context

    return _retrieve_single_category_services(entities, message, services, get_civic_points)


def _retrieve_single_category_services(
    entities: ExtractedEntities,
    message: str,
    services: list[dict],
    get_civic_points: object,
) -> tuple[list[SourceItem], list[MapHighlight], str]:
    """Retrieve services for a single category match."""
    query = (entities.service_category or message).lower()
    query_words = query.split()
    matches = []
    for s in services:
        text = (
            f"{s.get('title', '')} {s.get('description', '')} "
            f"{s.get('category', '')} {' '.join(s.get('tags', []))}".lower()
        )
        if any(w in text for w in query_words):
            matches.append(s)
    matches = matches[:5]

    sources = [
        SourceItem(
            title=s.get("title", ""),
            description=s.get("description", ""),
            url=s.get("url"),
            category=s.get("category"),
        )
        for s in matches
    ]

    if not sources and entities.service_category:
        map_sources = get_map_category_sources(entities.service_category, entities.neighborhood)
        if map_sources:
            sources = map_sources

    highlights = _build_civic_point_highlights(entities.service_category or "", get_civic_points)
    context = _build_services_context(matches, sources)
    return sources, highlights, context


def _build_civic_point_highlights(
    category: str, get_civic_points: object
) -> list[MapHighlight]:
    """Build map highlights from civic points matching the category."""
    from backend.models import MapHighlight as MH

    points = get_civic_points()
    point_matches = [p for p in points if category in (p.get("category", "") or "").lower()][:5]
    highlights = []
    for p in point_matches:
        coords = p.get("_coords")
        if coords and len(coords) >= 2:
            highlights.append(MH(
                lat=coords[1], lng=coords[0],
                label=p.get("name", p.get("Name", "")),
                category=p.get("category"),
            ))
    return highlights


def _build_multi_category_context(sources: list[SourceItem]) -> str:
    """Build context string for multi-category service results."""
    if not sources:
        return ""
    lines = ["Relevant Montgomery services:"]
    for s in sources:
        lines.append(f"- {s.title}: {s.description[:120]}")
    return "\n".join(lines)


def _build_services_context(matches: list[dict], sources: list[SourceItem]) -> str:
    """Build context string for single-category service results."""
    if matches:
        lines = ["Relevant Montgomery services:"]
        for s in matches:
            lines.append(f"- {s.get('title')}: {s.get('description', '')[:120]}")
            if s.get("phone"):
                lines.append(f"  Phone: {s['phone']}")
            if s.get("address"):
                lines.append(f"  Address: {s['address']}")
        return "\n".join(lines)
    elif sources:
        lines = ["Montgomery city services (map data):"]
        for s in sources:
            lines.append(f"- {s.title}: {s.description}")
        return "\n".join(lines)
    return ""


def retrieve_services_multi(
    categories: list[str], get_gov_services: object
) -> list[SourceItem]:
    """Retrieve services across multiple categories (for compound queries)."""
    services = get_gov_services()
    results: list[SourceItem] = []
    for cat in categories:
        cat_matches = [
            s for s in services
            if cat in s.get("category", "").lower()
            or cat in s.get("title", "").lower()
            or cat in s.get("description", "").lower()
            or any(cat in t for t in s.get("tags", []))
        ][:2]
        for s in cat_matches:
            results.append(SourceItem(
                title=s.get("title", ""),
                description=s.get("description", ""),
                url=s.get("url"),
                category=s.get("category"),
            ))
    return results[:8]


def get_map_category_sources(
    category: str, neighborhood: str | None = None,
) -> list[SourceItem]:
    """Return synthetic sources for categories that live on the frontend map."""
    info = _MAP_CATEGORY_INFO.get(category)
    if not info:
        return []

    location = f" near {neighborhood}" if neighborhood else " in Montgomery"
    return [
        SourceItem(
            title=f"{info['label']}{location}",
            description=info["description"],
            category=category,
        ),
        SourceItem(
            title=info["note"],
            description="Locations are shown on the interactive map. Browse the Services tab for details.",
            category=category,
        ),
    ]


def build_report_context(entities: ExtractedEntities, message: str = "") -> str:
    """Build context for issue reporting, including trash schedule combo."""
    lower = message.lower()
    parts = ["The citizen wants to report a civic issue."]
    if entities.issue_type:
        parts.append(f"Issue type: {entities.issue_type}")
    if entities.address:
        parts.append(f"Location: {entities.address}")
    if entities.neighborhood:
        parts.append(f"Neighborhood: {entities.neighborhood}")

    if "trash" in lower and ("schedule" in lower or "pickup" in lower or "collected" in lower):
        parts.append("COMBO_QUERY: trash_schedule_and_report")
        parts.append("Montgomery trash pickup: Mon/Thu (north), Tue/Fri (south), Wed (downtown).")
        parts.append("Missed pickup? Report via 311 or montgomeryalabama.gov/311.")

    parts.append(
        "Montgomery 311 handles: potholes, streetlights, trash, flooding, "
        "graffiti, sewer, noise, abandoned vehicles, sidewalks, traffic signals."
    )
    parts.append("Citizens can report online at montgomeryalabama.gov or call 311.")
    return "\n".join(parts)
