"""Date/time parsing utilities for temporal intent detection.

Resolves phrases like "this weekend", "today", "tomorrow" into
concrete date ranges for event filtering.
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from typing import NamedTuple


class DateRange(NamedTuple):
    start: date
    end: date
    label: str  # human-readable label like "this weekend (Mar 7-8)"


def parse_temporal_intent(message: str, reference: date | None = None) -> DateRange | None:
    """Parse temporal phrases from a message into a date range.

    Returns None if no temporal intent is detected.
    """
    ref = reference or date.today()
    lower = message.lower()

    # "this weekend" → upcoming Saturday-Sunday
    if "this weekend" in lower or "the weekend" in lower:
        days_until_sat = (5 - ref.weekday()) % 7
        if days_until_sat == 0 and ref.weekday() == 5:
            sat = ref
        else:
            sat = ref + timedelta(days=days_until_sat if days_until_sat > 0 else 7)
        sun = sat + timedelta(days=1)
        return DateRange(sat, sun, f"this weekend ({sat.strftime('%b %d')}–{sun.strftime('%b %d')})")

    # "today"
    if "today" in lower or "tonight" in lower:
        return DateRange(ref, ref, f"today ({ref.strftime('%b %d')})")

    # "tomorrow"
    if "tomorrow" in lower:
        tmrw = ref + timedelta(days=1)
        return DateRange(tmrw, tmrw, f"tomorrow ({tmrw.strftime('%b %d')})")

    # "this week"
    if "this week" in lower:
        # Monday through Sunday of current week
        monday = ref - timedelta(days=ref.weekday())
        sunday = monday + timedelta(days=6)
        return DateRange(monday, sunday, f"this week ({monday.strftime('%b %d')}–{sunday.strftime('%b %d')})")

    # "next week"
    if "next week" in lower:
        next_monday = ref + timedelta(days=(7 - ref.weekday()))
        next_sunday = next_monday + timedelta(days=6)
        return DateRange(next_monday, next_sunday, f"next week ({next_monday.strftime('%b %d')}–{next_sunday.strftime('%b %d')})")

    # "upcoming" / "soon" / "near future"
    if any(w in lower for w in ["upcoming", "soon", "near future", "coming up"]):
        end = ref + timedelta(days=14)
        return DateRange(ref, end, f"next 2 weeks ({ref.strftime('%b %d')}–{end.strftime('%b %d')})")

    return None


def filter_events_by_date(
    events: list[dict],
    date_range: DateRange,
) -> list[dict]:
    """Filter events whose date falls within the given range."""
    results = []
    for e in events:
        event_date_str = e.get("date", "")
        try:
            event_date = date.fromisoformat(event_date_str)
            if date_range.start <= event_date <= date_range.end:
                results.append(e)
        except (ValueError, TypeError):
            continue
    return results
