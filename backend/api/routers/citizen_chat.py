"""Citizen AI chatbot and predictive analysis endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(tags=["citizen-chat"])


class CitizenChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    context: dict | None = None


@router.post("/citizen-chat")
async def citizen_chat(request: CitizenChatRequest) -> JSONResponse:
    """AI civic chatbot endpoint for citizen queries."""
    from backend.models import ChatRequest
    from backend.chatbot.responder import handle_chat

    chat_req = ChatRequest(
        message=request.message,
        conversation_id=request.conversation_id,
        context=request.context,
    )
    response = await handle_chat(chat_req)
    return JSONResponse(response.to_dict())


@router.get("/predictions/hotspots")
async def predictions_hotspots() -> JSONResponse:
    """Return civic hotspot predictions by neighborhood."""
    from backend.predictive.hotspot_scorer import compute_hotspots

    results = compute_hotspots()
    return JSONResponse({
        "hotspots": [r.to_dict() for r in results],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "weights": {
            "complaint_volume": 0.4,
            "complaint_growth_rate": 0.3,
            "event_density": 0.2,
            "negative_sentiment": 0.1,
        },
    })


@router.get("/predictions/trends")
async def predictions_trends() -> JSONResponse:
    """Return civic complaint trend analysis."""
    from backend.predictive.trend_detector import detect_trends

    results = detect_trends()
    return JSONResponse({
        "trends": [r.to_dict() for r in results],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
