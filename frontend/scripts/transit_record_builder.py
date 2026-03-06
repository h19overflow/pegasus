"""Build structured route records from raw scraped schedule data."""

from transit_time_utils import summarise_schedule


def build_route_record(route_info: dict, raw: dict) -> dict:
    """Transform raw scraped data into the output schema."""
    number = route_info["number"]
    name = raw.get("title") or route_info["name"]
    description = raw.get("description", "")

    schedule = {"weekday": None, "saturday": None}
    timepoints_by_day = _extract_timepoints_by_day(raw.get("scheduleBlocks", []))

    for day in ("weekday", "saturday"):
        all_times = _collect_all_times(timepoints_by_day[day])
        if all_times:
            schedule[day] = summarise_schedule(all_times)

    primary_day = "weekday" if timepoints_by_day["weekday"] else "saturday"
    timepoints = [
        {"name": stop, "times": times}
        for stop, times in timepoints_by_day[primary_day].items()
    ]

    return {
        "id": f"route-{number}",
        "name": name,
        "number": number,
        "schedule": schedule,
        "timepoints": timepoints,
        "description": description,
    }


def _extract_timepoints_by_day(
    schedule_blocks: list[dict],
) -> dict[str, dict[str, list[str]]]:
    """Group stop names and times by day from schedule blocks."""
    timepoints_by_day: dict[str, dict[str, list[str]]] = {
        "weekday": {},
        "saturday": {},
    }

    for block in schedule_blocks:
        day = block["day"]
        headers = block["headers"]
        rows = block["rows"]

        for col_index, stop_name in enumerate(headers):
            if not stop_name:
                continue
            if stop_name not in timepoints_by_day[day]:
                timepoints_by_day[day][stop_name] = []
            for row in rows:
                if col_index < len(row) and row[col_index]:
                    timepoints_by_day[day][stop_name].append(row[col_index])

    return timepoints_by_day


def _collect_all_times(stops_dict: dict[str, list[str]]) -> list[str]:
    """Flatten all time strings from every stop into one list."""
    times: list[str] = []
    for stop_times in stops_dict.values():
        times.extend(stop_times)
    return times
