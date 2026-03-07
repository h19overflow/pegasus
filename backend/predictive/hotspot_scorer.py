"""Weighted hotspot scoring model for civic predictive analysis.

Formula:
  hotspot_score = 0.4 * complaint_volume
               + 0.3 * complaint_growth_rate
               + 0.2 * event_density
               + 0.1 * negative_sentiment

All inputs are normalized to 0-100 before weighting.
Sentiment is optional (defaults to 0 if unavailable).
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from backend.models import PredictionResult, HotspotDriver
from backend.predictive.mock_data import load_complaints, load_events

# Configurable weights
WEIGHTS = {
    "complaint_volume": 0.4,
    "complaint_growth_rate": 0.3,
    "event_density": 0.2,
    "negative_sentiment": 0.1,
}

RISK_THRESHOLDS = {
    "critical": 75,
    "high": 50,
    "medium": 25,
    "low": 0,
}


def _normalize(value: float, max_value: float) -> float:
    """Normalize a value to 0-100 scale."""
    if max_value <= 0:
        return 0.0
    return min(100.0, (value / max_value) * 100.0)


def _risk_level(score: float) -> str:
    for level, threshold in RISK_THRESHOLDS.items():
        if score >= threshold:
            return level
    return "low"


def _build_explanation(
    neighborhood: str,
    category: str,
    drivers: list[dict],
    risk: str,
) -> str:
    """Build a human-readable explanation of the hotspot score."""
    top_driver = max(drivers, key=lambda d: d["contribution"]) if drivers else None
    if not top_driver:
        return f"{neighborhood} shows normal activity levels."

    factor_labels = {
        "complaint_volume": "complaint volume",
        "complaint_growth_rate": "rising complaint trend",
        "event_density": "upcoming event activity",
        "negative_sentiment": "negative community sentiment",
    }
    factor_name = factor_labels.get(top_driver["factor"], top_driver["factor"])

    if risk == "critical":
        return f"{neighborhood} is a critical hotspot for {category} issues, primarily driven by {factor_name}."
    elif risk == "high":
        return f"{neighborhood} shows elevated {category} activity. Main driver: {factor_name}."
    elif risk == "medium":
        return f"{neighborhood} has moderate {category} concerns. Watch for {factor_name}."
    else:
        return f"{neighborhood} is currently stable for {category} issues."


def _ui_label(neighborhood: str, risk: str, category: str) -> str:
    labels = {
        "critical": f"🔴 {neighborhood}: Critical {category} hotspot",
        "high": f"🟠 {neighborhood}: High {category} risk",
        "medium": f"🟡 {neighborhood}: Moderate {category} activity",
        "low": f"🟢 {neighborhood}: Stable",
    }
    return labels.get(risk, f"{neighborhood}: {category}")


def compute_hotspots(
    sentiment_scores: dict[str, float] | None = None,
) -> list[PredictionResult]:
    """Compute hotspot scores for all neighborhoods.

    Args:
        sentiment_scores: Optional dict of {area_id: negative_sentiment_score (0-100)}.
    """
    complaints = load_complaints()
    events = load_events()
    sentiment_scores = sentiment_scores or {}

    # Group complaints by (area_id, neighborhood, category)
    area_complaints: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for c in complaints:
        key = (c["area_id"], c["neighborhood"])
        area_complaints[key].append(c)

    # Group events by area_id
    area_events: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        area_events[e["area_id"]].append(e)

    # Find max values for normalization
    all_volumes = []
    all_growth_rates = []
    all_event_counts = []

    area_stats: dict[tuple[str, str], dict[str, Any]] = {}

    for (area_id, neighborhood), comps in area_complaints.items():
        # Split into periods (Jan vs Feb based on date)
        jan = [c for c in comps if c["date"].startswith("2026-01")]
        feb = [c for c in comps if c["date"].startswith("2026-02")]

        volume = len(comps)
        growth = ((len(feb) - len(jan)) / max(len(jan), 1)) * 100
        event_count = len(area_events.get(area_id, []))

        # Dominant category
        cat_counts: dict[str, int] = defaultdict(int)
        for c in comps:
            cat_counts[c["category"]] += 1
        top_category = max(cat_counts, key=cat_counts.get) if cat_counts else "general"  # type: ignore[arg-type]

        area_stats[(area_id, neighborhood)] = {
            "volume": volume,
            "growth": growth,
            "event_count": event_count,
            "top_category": top_category,
            "jan_count": len(jan),
            "feb_count": len(feb),
        }

        all_volumes.append(volume)
        all_growth_rates.append(abs(growth))
        all_event_counts.append(event_count)

    max_volume = max(all_volumes) if all_volumes else 1
    max_growth = max(all_growth_rates) if all_growth_rates else 1
    max_events = max(all_event_counts) if all_event_counts else 1

    # Compute scores
    results: list[PredictionResult] = []

    for (area_id, neighborhood), stats in area_stats.items():
        norm_volume = _normalize(stats["volume"], max_volume)
        norm_growth = _normalize(max(stats["growth"], 0), max_growth)
        norm_events = _normalize(stats["event_count"], max_events)
        norm_sentiment = sentiment_scores.get(area_id, 0.0)

        score = (
            WEIGHTS["complaint_volume"] * norm_volume
            + WEIGHTS["complaint_growth_rate"] * norm_growth
            + WEIGHTS["event_density"] * norm_events
            + WEIGHTS["negative_sentiment"] * norm_sentiment
        )

        drivers = [
            {"factor": "complaint_volume", "value": round(norm_volume, 1), "weight": WEIGHTS["complaint_volume"], "contribution": round(WEIGHTS["complaint_volume"] * norm_volume, 1)},
            {"factor": "complaint_growth_rate", "value": round(norm_growth, 1), "weight": WEIGHTS["complaint_growth_rate"], "contribution": round(WEIGHTS["complaint_growth_rate"] * norm_growth, 1)},
            {"factor": "event_density", "value": round(norm_events, 1), "weight": WEIGHTS["event_density"], "contribution": round(WEIGHTS["event_density"] * norm_events, 1)},
            {"factor": "negative_sentiment", "value": round(norm_sentiment, 1), "weight": WEIGHTS["negative_sentiment"], "contribution": round(WEIGHTS["negative_sentiment"] * norm_sentiment, 1)},
        ]

        risk = _risk_level(score)
        trend = "rising" if stats["growth"] > 20 else ("falling" if stats["growth"] < -20 else "stable")

        results.append(PredictionResult(
            area_id=area_id,
            neighborhood=neighborhood,
            category=stats["top_category"],
            hotspot_score=score,
            risk_level=risk,
            drivers=drivers,
            trend_direction=trend,
            recommended_label_for_ui=_ui_label(neighborhood, risk, stats["top_category"]),
            explanation=_build_explanation(neighborhood, stats["top_category"], drivers, risk),
        ))

    results.sort(key=lambda r: r.hotspot_score, reverse=True)
    return results
