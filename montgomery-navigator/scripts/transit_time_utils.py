"""Utility functions for parsing and formatting transit schedule times."""

import re


def parse_time_to_minutes(time_str: str) -> int | None:
    """Convert a time string like '5:30' or '5:30 AM' to minutes since midnight."""
    time_str = time_str.strip().upper()
    match = re.match(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", time_str)
    if not match:
        return None
    hours, minutes = int(match.group(1)), int(match.group(2))
    ampm = match.group(3)
    if ampm == "PM" and hours != 12:
        hours += 12
    elif ampm == "AM" and hours == 12:
        hours = 0
    return hours * 60 + minutes


def minutes_to_display(total_minutes: int) -> str:
    """Convert minutes since midnight to '5:30 AM' display format."""
    hours = total_minutes // 60
    mins = total_minutes % 60
    if hours == 0:
        return f"12:{mins:02d} AM"
    elif hours < 12:
        return f"{hours}:{mins:02d} AM"
    elif hours == 12:
        return f"12:{mins:02d} PM"
    else:
        return f"{hours - 12}:{mins:02d} PM"


def summarise_schedule(all_times: list[str]) -> dict:
    """Derive start, end, and approximate frequency from a list of time strings."""
    parsed = [parse_time_to_minutes(t) for t in all_times]
    valid = sorted(set(m for m in parsed if m is not None))
    if not valid:
        return {"start": "", "end": "", "frequency_minutes": 0}

    if len(valid) >= 2:
        gaps = [valid[i + 1] - valid[i] for i in range(len(valid) - 1)]
        gaps = [g for g in gaps if 10 <= g <= 180]
        frequency = round(sum(gaps) / len(gaps)) if gaps else 60
    else:
        frequency = 60

    return {
        "start": minutes_to_display(valid[0]),
        "end": minutes_to_display(valid[-1]),
        "frequency_minutes": frequency,
    }
