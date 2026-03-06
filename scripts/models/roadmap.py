# scripts/models/roadmap.py
"""
Pydantic models for the Roadmap Agent.

These models define the contract between:
  - Python (snake_case internally)
  - TypeScript frontend (camelCase in JSON)
  - Gemini API (we parse its JSON output into these)

The alias_generator handles the snake_case ↔ camelCase conversion
automatically on serialization, so you never manually rename fields.
"""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class CamelModel(BaseModel):
    """
    Base class: all fields serialize to camelCase in JSON output.
    populate_by_name=True means you can construct with either
    snake_case OR camelCase — useful when parsing Gemini's output.
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class RoadmapLocation(CamelModel):
    """Physical office details — only present for in-person steps."""
    name: str
    address: str
    hours: str
    phone: Optional[str] = None


class RoadmapStep(CamelModel):
    """A single personalized step in the citizen's roadmap."""
    id: str
    step_number: int
    title: str
    # Plain-English instruction, tailored to this citizen's situation
    action: str
    # Only the documents relevant to THIS step, filtered for this citizen
    documents: list[str] = Field(default_factory=list)
    # None for online steps, populated for in-person steps
    location: Optional[RoadmapLocation] = None
    estimated_time: str
    # Montgomery-specific "watch out" — what trips people up in real life
    pro_tip: Optional[str] = None
    can_do_online: bool = False
    online_url: Optional[str] = None


class PersonalizedRoadmap(CamelModel):
    """The complete personalized roadmap returned to the frontend."""
    id: str
    service_id: str
    service_title: str
    service_category: str
    # Why THIS citizen qualifies — specific to their profile
    eligibility_note: str
    total_estimated_time: str
    steps: list[RoadmapStep]
    generated_at: str  # ISO timestamp


class CitizenCivicData(CamelModel):
    """
    Mirrors CitizenCivicData from src/lib/types.ts exactly.
    This is what the frontend sends us — the active citizen's profile.
    """
    zip: Optional[str] = None
    household_size: Optional[int] = None
    income: Optional[float] = None
    income_source: Optional[str] = None
    housing_type: Optional[str] = None
    monthly_rent: Optional[float] = None
    has_vehicle: Optional[bool] = None
    children: Optional[int] = None
    children_ages: Optional[list[int]] = None
    veteran_status: Optional[bool] = False
    disability_status: Optional[bool] = False
    citizenship_status: Optional[str] = "citizen"
    needs_housing_help: Optional[bool] = False
    needs_utility_help: Optional[bool] = False
    neighborhood: Optional[str] = None
    needs_childcare: Optional[bool] = False
    needs_legal_help: Optional[bool] = False
    health_insurance: Optional[str] = None
    primary_transport: Optional[str] = None


class CitizenMeta(CamelModel):
    """Mirrors CitizenMeta from src/lib/types.ts."""
    id: str
    persona: str
    tagline: str
    goals: list[str]
    barriers: list[str]
    civic_data: CitizenCivicData


class RoadmapRequest(CamelModel):
    """
    The POST body from the React frontend.
    Frontend sends { citizen: CitizenMeta, serviceId: string }.
    """
    citizen: CitizenMeta
    service_id: str  