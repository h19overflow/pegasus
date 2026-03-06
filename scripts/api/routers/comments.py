"""Comments endpoint: serve seed comments from exported_comments.json."""

import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(tags=["comments"])

COMMENTS_PATH = Path(__file__).parent.parent.parent / "data" / "exported_comments.json"


@router.get("/comments")
async def get_comments() -> dict:
    """Return all seed comments from exported_comments.json."""
    if not COMMENTS_PATH.exists():
        return {"comments": []}

    data = json.loads(COMMENTS_PATH.read_text(encoding="utf-8"))
    return {"comments": data.get("comments", [])}
