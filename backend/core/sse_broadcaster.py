"""In-memory SSE broadcaster for pushing live data to connected clients.

Maintains a set of asyncio.Queue instances — one per connected client.
When data arrives via webhook, broadcast_event pushes to all queues.
"""

import asyncio
import json
from collections.abc import AsyncGenerator

_client_queues: set[asyncio.Queue] = set()


def create_client_queue() -> asyncio.Queue:
    """Register a new client and return its queue."""
    queue: asyncio.Queue = asyncio.Queue()
    _client_queues.add(queue)
    return queue


def remove_client_queue(queue: asyncio.Queue) -> None:
    """Unregister a client queue."""
    _client_queues.discard(queue)


def broadcast_event(event_type: str, data: list | dict) -> None:
    """Push a JSON event to all connected clients (non-blocking)."""
    payload = json.dumps({"type": event_type, "data": data})
    for queue in _client_queues:
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass  # drop for slow clients


async def stream_events(queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    """Async generator yielding SSE-formatted messages from a client queue."""
    while True:
        payload = await queue.get()
        yield f"data: {payload}\n\n"
