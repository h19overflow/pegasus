"""Mayor chat endpoint with SSE streaming."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from backend.agents.mayor_chat import stream_mayor_response

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@router.post("/chat")
async def mayor_chat(request: ChatRequest):
    """Stream mayor chat agent response via SSE."""

    async def event_generator():
        try:
            async for event_type, data in stream_mayor_response(
                request.message, [m.model_dump() for m in request.history]
            ):
                yield {"event": event_type, "data": data}
            yield {"event": "done", "data": ""}
        except Exception as e:
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(event_generator())
