"""
Roadmap Agent — Agent 3 of MontgomeryAI Navigator.

Generates a personalized step-by-step civic service roadmap for a specific
citizen by grounding Gemini in real Montgomery service documentation.

The two-phase Retrieve→Reason pattern prevents hallucination:
  - We retrieve actual eligibility rules, documents, addresses from gov_services.json
  - We ask Gemini to PERSONALIZE that real data for this specific citizen
  - We never ask Gemini to invent facts

This module is stateless and side-effect-free. The FastAPI route in
webhook_server.py calls generate_personalized_roadmap() and handles HTTP.
"""

import json
import re
import logging
import hashlib
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from scripts.redis_client import cache

from scripts.config import require_env
from scripts.models.roadmap import (
    CitizenMeta, PersonalizedRoadmap, RoadmapStep, RoadmapLocation,
)
from scripts.config import PUBLIC_DATA

logger = logging.getLogger("roadmap_agent")

# Shared data file — both Python backend and React frontend read from here.
# Defined once so if the path ever changes, it changes in one place.
_GOV_SERVICES_PATH = PUBLIC_DATA / "gov_services.json"



# ── Phase 1: Retrieve ─────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_services() -> dict[str, dict]:
    """
    Load gov_services.json once and cache forever (lru_cache with maxsize=1).
    One file read for the entire server lifetime. Returns dict keyed by ID.
    """
    with open(_GOV_SERVICES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {svc["id"]: svc for svc in data["services"]}


def _get_service(service_id: str) -> dict:
    """Retrieve a service by ID. Raises ValueError with helpful message if missing."""
    services = _load_services()
    if service_id not in services:
        available = list(services.keys())
        raise ValueError(f"Service '{service_id}' not found. Available: {available}")
    return services[service_id]


def _format_guide_for_prompt(guide: dict) -> str:
    """
    Convert raw JSON service guide into labeled prose for the Gemini prompt.
    Gemini reasons better over structured prose than raw JSON.
    """
    lines = [
        f"SERVICE: {guide['title']}",
        f"PROVIDER: {guide.get('provider', 'N/A')}",
        f"DESCRIPTION: {guide.get('description', '')}",
        f"ADDRESS: {guide.get('address', 'N/A')}",
        f"PHONE: {guide.get('phone', 'N/A')}",
        f"WEBSITE: {guide.get('url', 'N/A')}",
        "", "ELIGIBILITY CRITERIA:",
    ]
    for item in guide.get("eligibility", []):
        lines.append(f"  - {item}")

    lines += ["", "HOW TO APPLY (each item becomes one roadmap step):"]
    for i, step in enumerate(guide.get("how_to_apply", []), 1):
        lines.append(f"  {i}. {step}")

    lines += ["", "DOCUMENTS NEEDED:"]
    for doc in guide.get("documents_needed", []):
        lines.append(f"  - {doc}")

    limits = guide.get("income_limits")
    if limits:
        lines += ["", "INCOME LIMITS:"]
        if isinstance(limits, dict):
            for size, amt in limits.items():
                lines.append(f"  - Household of {size}: ${amt:,}/month")
        else:
            for item in limits:
                lines.append(f"  - {item}")

    return "\n".join(lines)


# ── Phase 2: Reason (Gemini) ──────────────────────────────────────────────────

def _build_citizen_summary(citizen: CitizenMeta) -> str:
    """Convert CitizenMeta into readable prose for the prompt."""
    cd = citizen.civic_data
    return "\n".join([
        f"Persona: {citizen.persona}",
        f"Tagline: {citizen.tagline}",
        f"Zip Code: {cd.zip or 'Montgomery, AL'}",
        f"Household size: {cd.household_size or 'unknown'} people",
        f"Monthly income: ${cd.income or 'unknown'}/month from {cd.income_source or 'unknown source'}",
        f"Housing: {cd.housing_type or 'unknown'}, rent ${cd.monthly_rent or 'unknown'}/month",
        f"Children: {cd.children or 0} (ages: {cd.children_ages or 'N/A'})",
        f"Has vehicle: {cd.has_vehicle} | Transport: {cd.primary_transport or 'unknown'}",
        f"Veteran: {cd.veteran_status} | Disability: {cd.disability_status}",
        f"Citizenship: {cd.citizenship_status}",
        f"Health insurance: {cd.health_insurance or 'none/unknown'}",
        f"Goals: {'; '.join(citizen.goals[:2])}",
        f"Barriers: {'; '.join(citizen.barriers[:2])}",
    ])


_OUTPUT_SCHEMA = """
{
  "eligibility_note": "<why THIS specific citizen qualifies — reference their income, family size, housing>",
  "total_estimated_time": "<realistic total e.g. '3–4 weeks'>",
  "steps": [
    {
      "step_number": 1,
      "title": "<action-oriented title, max 6 words>",
      "action": "<personalized plain-English instruction for THIS citizen>",
      "documents": ["<only docs relevant to this citizen for this step>"],
      "location": {"name": "...", "address": "...", "hours": "...", "phone": "..."} or null,
      "estimated_time": "<e.g. '30 minutes' or '1–2 weeks'>",
      "pro_tip": "<Montgomery-specific warning or null>",
      "can_do_online": true or false,
      "online_url": "<url or null>"
    }
  ]
}"""


def _call_gemini(citizen: "CitizenMeta | None", guide: dict) -> dict:
    """
    Call Gemini with optional citizen profile + service documentation.
    Returns parsed JSON dict. Strips markdown fences if present.

    When citizen is None, generates a generic step-by-step guide for any
    Montgomery resident using only the official service documentation.
    When citizen is provided, personalizes each step for that individual.

    Temperature 0.1 — factual, deterministic output, not creativity.
    """
    from google import genai
    from google.genai import types

    # Lazy init — only configure when called, not at import time
    client = genai.Client(api_key=require_env("GEMINI_API_KEY"))
    model_id = "gemini-2.0-flash"

    system_instruction = """You are CivicPath, a expert civic navigator for Montgomery, Alabama.
Your mission is to transform dry, bureaucratic government service documentation into clear, 
actionable, and personalized step-by-step roadmaps for residents.

## GUIDING PRINCIPLES
1. PLAIN ENGLISH: Strip away all legal/bureaucratic jargon. Speak like a helpful neighbor.
2. GROUNDING: Only use facts provided in the "Official Service Documentation". Never invent rules.
3. LOCAL PRECISION: Always use specific Montgomery office names, addresses, and hours. 
4. THIN DATA HANDLING: If the documentation is missing steps or mentions "call for details", 
   your roadmap MUST include a first step instructing the user to contact the provider 
   to confirm requirements. Never return an empty list of steps.

## OUTPUT FORMAT
Always return a valid JSON object matching the requested schema. No markdown, no conversational filler."""

    if citizen is None:
        # ── Generic path: no citizen profile ─────────────────────────────────
        prompt = f"""Convert this government service documentation into a clear, 
step-by-step roadmap that any Montgomery resident can follow.

## OFFICIAL SERVICE DOCUMENTATION
{_format_guide_for_prompt(guide)}

## YOUR TASK
For each step in "HOW TO APPLY", write a clear guide. 
If "HOW TO APPLY" is empty or has zero steps, create a roadmap that starts with 
"Contact {guide['title']} to begin" and provide the office contact details.

## JSON SCHEMA REQUIREMENT
Return a JSON object with:
- "eligibility_note": Summarize who qualifies based on official criteria.
- "total_estimated_time": Realistic total (e.g., '3–4 weeks').
- "steps": List of objects with [step_number, title, action, documents, location, estimated_time, pro_tip (Montgomery-specific), can_do_online, online_url]."""
    else:
        # ── Personalized path: citizen profile provided ────────────────────────
        prompt = f"""Transform this application process into a PERSONALIZED roadmap 
for the citizen described below. Every instruction must speak directly to their situation.

## CITIZEN PROFILE
{_build_citizen_summary(citizen)}

## OFFICIAL SERVICE DOCUMENTATION
{_format_guide_for_prompt(guide)}

## YOUR TASK
1. Analyze the citizen's profile against the official requirements.
2. Filter the "DOCUMENTS NEEDED" to only those this specific citizen would need.
3. Rewrite the application steps in a first-person "You need to..." style.
4. If "HOW TO APPLY" is empty, guide them on how to contact the office for their specific case.

## JSON SCHEMA REQUIREMENT
Return a JSON object with:
- "eligibility_note": Explain why THIS specific citizen (referencing their income/family/status) qualifies.
- "total_estimated_time": Realistic total.
- "steps": List of objects with [step_number, title, action, documents, location, estimated_time, pro_tip, can_do_online, online_url]."""

    response = client.models.generate_content(
        model=model_id,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    raw = response.text.strip()
    # Strip markdown fences — Gemini sometimes adds them despite response_mime_type
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    # Repair trailing commas in arrays/objects (Gemini 2.0 common quirk)
    raw = re.sub(r",\s*([\]}])", r"\1", raw)

    return json.loads(raw)


# ── Phase 3: Validate ─────────────────────────────────────────────────────────

def _build_roadmap_model(
    gemini_output: dict,
    guide: dict,
    citizen: "CitizenMeta | None",
) -> PersonalizedRoadmap:
    """
    Convert Gemini's raw dict into a validated PersonalizedRoadmap.
    Pydantic validation here means bad Gemini output fails loudly at the
    API boundary rather than silently corrupting the frontend state.
    """
    steps = []
    for i, raw_step in enumerate(gemini_output.get("steps", [])):
        loc_data = raw_step.get("location")
        # Robust handling: only pass to RoadmapLocation if it's a non-empty dict
        location = None
        if isinstance(loc_data, dict) and loc_data:
            try:
                location = RoadmapLocation(**loc_data)
            except Exception as e:
                logger.warning("Invalid location data in step %d: %s", i+1, e)

        steps.append(RoadmapStep(
            id=f"step-{i + 1}-{guide['id']}",
            step_number=raw_step.get("step_number", i + 1),
            title=raw_step.get("title", f"Step {i + 1}"),
            action=raw_step.get("action", ""),
            documents=raw_step.get("documents", []),
            location=location,
            estimated_time=raw_step.get("estimated_time", "Varies"),
            pro_tip=raw_step.get("pro_tip"),
            can_do_online=raw_step.get("can_do_online", False),
            online_url=raw_step.get("online_url"),
        ))

    citizen_id = citizen.id if citizen else "generic"
    now = datetime.now(timezone.utc)
    return PersonalizedRoadmap(
        id=f"roadmap-{guide['id']}-{citizen_id}-{int(now.timestamp())}",
        service_id=guide["id"],
        service_title=guide["title"],
        service_category=guide.get("category", ""),
        eligibility_note=gemini_output.get("eligibility_note", ""),
        total_estimated_time=gemini_output.get("total_estimated_time", "Varies"),
        steps=steps,
        generated_at=now.isoformat(),
    )


# ── Public API ────────────────────────────────────────────────────────────────

def _get_cache_key(service_id: str, citizen: "CitizenMeta | None") -> str:
    """
    Generate a unique cache key based on service and citizen profile.
    Uses MD5 hash of the citizen data to ensure profile changes bust the cache.
    """
    if not citizen:
        return f"roadmap:generic:{service_id}"
    
    # Hash the citizen data for a compact, stable key
    citizen_json = citizen.model_dump_json(by_alias=True)
    citizen_hash = hashlib.md5(citizen_json.encode()).hexdigest()
    return f"roadmap:pers:{service_id}:{citizen_hash}"


def generate_personalized_roadmap(
    citizen: "CitizenMeta | None",
    service_id: str,
) -> PersonalizedRoadmap:
    """
    Main entry point. Called by the FastAPI route in webhook_server.py.

    citizen is optional. When None, Gemini generates a generic step-by-step
    guide for any Montgomery resident using only the service documentation.
    When provided, returns a roadmap personalized to that citizen's profile.

    Raises ValueError if service_id not found in gov_services.json.
    Raises RuntimeError if Gemini call fails (caller handles graceful fallback).
    """
    citizen_id = citizen.id if citizen else "generic"
    cache_key = _get_cache_key(service_id, citizen)

    # 1. Check Cache
    cached_data = cache.fetch(cache_key)
    if cached_data:
        try:
            logger.info("Cache HIT for %s", cache_key)
            return PersonalizedRoadmap(**cached_data)
        except Exception as e:
            logger.warning("Cache data not available: %s", e)

    logger.info("Cache MISS for %s. Generating roadmap...", cache_key)
    guide = _get_service(service_id)
    logger.info("Retrieved: %s (%d steps)", guide["title"], len(guide.get("how_to_apply", [])))

    try:
        gemini_output = _call_gemini(citizen, guide)
    except Exception as e:
        logger.error("Gemini failed: %s", e)
        raise RuntimeError(f"Gemini generation failed: {e}") from e

    roadmap = _build_roadmap_model(gemini_output, guide, citizen)
    
    # 2. Store in Cache
    try:
        ttl = int(require_env("ROADMAP_CACHE_TTL"))
        cache.store(cache_key, roadmap.model_dump(by_alias=True), ttl=ttl)
        logger.info("Cached roadmap for %s (TTL: %d)", cache_key, ttl)
    except Exception as e:
        logger.warning("Cache write failed: %s", e)

    logger.info("Built roadmap with %d steps", len(roadmap.steps))
    return roadmap
