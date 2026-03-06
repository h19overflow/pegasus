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
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from scripts.config import require_env
from scripts.models.roadmap import (
    CitizenMeta, PersonalizedRoadmap, RoadmapStep, RoadmapLocation,
)
from scripts.triggers import PUBLIC_DATA

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


def _call_gemini(citizen: CitizenMeta, guide: dict) -> dict:
    """
    Call Gemini with the citizen profile + service documentation.
    Returns parsed JSON dict. Strips markdown fences if present.

    Temperature 0.1 — we want factual, deterministic output, not creativity.
    response_mime_type="application/json" tells Gemini to return JSON directly.
    """
    import google.generativeai as genai

    # Lazy init — only configure when called, not at import time
    genai.configure(api_key=require_env("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = f"""You are CivicPath, a civic navigator for Montgomery, Alabama.
Transform this generic government service application process into a PERSONALIZED
roadmap for one specific citizen. Every instruction must speak directly to their situation.

## CITIZEN PROFILE
{_build_citizen_summary(citizen)}

## OFFICIAL SERVICE DOCUMENTATION (ground truth — do not contradict this)
{_format_guide_for_prompt(guide)}

## YOUR TASK
For each step in "HOW TO APPLY", write a personalized version that:
1. Uses plain English — no bureaucratic language
2. References THIS citizen's specific situation (their income source, housing, family)
3. Names the exact Montgomery office, address, and hours — never write "local office"
4. Only lists documents relevant to THIS citizen (skip children's docs if no children,
   skip veteran docs if not a veteran, skip citizenship docs if US citizen)
5. Adds a pro_tip only for real Montgomery-specific warnings (not generic advice)
6. Sets can_do_online: true only if the step genuinely can be completed online

## STRICT RULES
- Return ONLY valid JSON matching the schema — no markdown, no explanation
- Never invent facts not in the documentation above
- If unsure about office hours, write: "Call {guide.get('phone', 'the office')} to confirm"
- eligibility_note MUST be specific to this citizen, not a generic eligibility statement

## OUTPUT SCHEMA
{_OUTPUT_SCHEMA}"""

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    raw = response.text.strip()
    # Strip markdown fences — Gemini sometimes adds them despite response_mime_type
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


# ── Phase 3: Validate ─────────────────────────────────────────────────────────

def _build_roadmap_model(
    gemini_output: dict,
    guide: dict,
    citizen: CitizenMeta,
) -> PersonalizedRoadmap:
    """
    Convert Gemini's raw dict into a validated PersonalizedRoadmap.
    Pydantic validation here means bad Gemini output fails loudly at the
    API boundary rather than silently corrupting the frontend state.
    """
    steps = []
    for i, raw_step in enumerate(gemini_output.get("steps", [])):
        loc_data = raw_step.get("location")
        location = RoadmapLocation(**loc_data) if loc_data else None

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

    now = datetime.now(timezone.utc)
    return PersonalizedRoadmap(
        id=f"roadmap-{guide['id']}-{citizen.id}-{int(now.timestamp())}",
        service_id=guide["id"],
        service_title=guide["title"],
        service_category=guide.get("category", ""),
        eligibility_note=gemini_output.get("eligibility_note", ""),
        total_estimated_time=gemini_output.get("total_estimated_time", "Varies"),
        steps=steps,
        generated_at=now.isoformat(),
    )


# ── Public API ────────────────────────────────────────────────────────────────

def generate_personalized_roadmap(
    citizen: CitizenMeta,
    service_id: str,
) -> PersonalizedRoadmap:
    """
    Main entry point. Called by the FastAPI route in webhook_server.py.

    Raises ValueError if service_id not found in gov_services.json.
    Raises RuntimeError if Gemini call fails (caller handles graceful fallback).
    """
    logger.info("Generating roadmap: citizen=%s service=%s", citizen.id, service_id)

    guide = _get_service(service_id)
    logger.info("Retrieved: %s (%d steps)", guide["title"], len(guide.get("how_to_apply", [])))

    try:
        gemini_output = _call_gemini(citizen, guide)
    except Exception as e:
        logger.error("Gemini failed: %s", e)
        raise RuntimeError(f"Gemini generation failed: {e}") from e

    roadmap = _build_roadmap_model(gemini_output, guide, citizen)
    logger.info("Built roadmap with %d steps", len(roadmap.steps))
    return roadmap
