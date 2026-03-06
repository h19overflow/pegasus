"""Job processing pipeline — extracted from job_scraper_service.py.

Handles skill extraction, geocoding (ArcGIS + Nominatim), GeoJSON
conversion, and deduplication for Indeed/LinkedIn/Glassdoor results.
"""

import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from scripts.config import SKILL_CATEGORIES, ARCGIS_BASE, OUTPUT_FILES, RAW_DIR


def detect_source(raw_jobs: list[dict]) -> str:
    """Detect which job board a batch of raw records came from."""
    if not raw_jobs:
        return "unknown"
    sample = raw_jobs[0]
    if sample.get("job_seniority_level") is not None:
        return "linkedin"
    if sample.get("company_url_overview") is not None:
        return "glassdoor"
    return "indeed"


def extract_skills(description: str) -> dict[str, list[str]]:
    """Extract skills from job description using keyword matching."""
    if not description:
        return {}
    text = description.lower()
    found = {}
    for category, keywords in SKILL_CATEGORIES.items():
        matches = [kw for kw in keywords if kw in text]
        if matches:
            found[category] = matches
    return found


def search_arcgis_business(company_name: str) -> tuple | None:
    """Search ArcGIS Business Licenses for company coordinates."""
    clean = company_name.upper().split(",")[0].strip()
    for suffix in [" INC", " LLC", " CORP", " CO", " LTD"]:
        clean = clean.replace(suffix, "")
    clean = clean.strip()

    if len(clean) < 3:
        return None

    encoded = urllib.parse.quote(clean)
    url = (
        f"{ARCGIS_BASE}/HostedDatasets/Business_License/FeatureServer/0/query"
        f"?where=custCOMPANY_NAME+LIKE+%27%25{encoded}%25%27"
        f"&outFields=custCOMPANY_NAME,Full_Address"
        f"&outSR=4326&f=geojson&resultRecordCount=1"
    )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            features = data.get("features", [])
            if features:
                coords = features[0]["geometry"]["coordinates"]
                name = features[0]["properties"].get("custCOMPANY_NAME", "")
                addr = features[0]["properties"].get("Full_Address", "")
                return coords[1], coords[0], name, addr
    except Exception:
        pass
    return None


def geocode_nominatim(address: str) -> tuple[float, float] | None:
    """Geocode via Nominatim. Returns (lat, lng) or None."""
    query = urllib.parse.quote(address)
    url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?q={query}&format=json&limit=1&countrycodes=us"
    )
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "MontgomeryAI-Hackathon/1.0")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read().decode())
            if results:
                return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass
    return None


def generate_job_id(job: dict) -> str:
    """Generate a stable ID for deduplication."""
    key = f"{job.get('job_title', '')}__{job.get('company_name', '')}__{job.get('url', '')}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def process_jobs(raw_jobs: list[dict], source: str) -> list[dict]:
    """Full pipeline: tag source -> extract skills -> geocode -> structure."""
    arcgis_cache: dict = {}
    nominatim_cache: dict = {}
    processed = []

    for job in raw_jobs:
        job["_source"] = source.lower()
        job["_id"] = generate_job_id(job)
        job["_scraped_at"] = datetime.now(timezone.utc).isoformat()

        desc = job.get("description_text") or job.get("description") or job.get("job_summary") or ""
        desc_clean = re.sub(r"<[^>]+>", " ", desc)
        skills = extract_skills(desc_clean)
        job["skills"] = skills
        all_skills = []
        for cat_skills in skills.values():
            all_skills.extend(cat_skills)
        job["skill_summary"] = ", ".join(all_skills)

        company = job.get("company_name", "")
        address = job.get("location") or job.get("job_location", "")

        if company and company not in arcgis_cache:
            arcgis_cache[company] = search_arcgis_business(company)
            time.sleep(0.3)

        arcgis_result = arcgis_cache.get(company)
        if arcgis_result:
            job["lat"] = arcgis_result[0]
            job["lng"] = arcgis_result[1]
            job["geocode_source"] = "arcgis_business_license"
            job["geocode_address"] = arcgis_result[3]
        elif address:
            if address not in nominatim_cache:
                nominatim_cache[address] = geocode_nominatim(address)
                time.sleep(1)
            nom = nominatim_cache.get(address)
            if nom:
                job["lat"] = nom[0]
                job["lng"] = nom[1]
                job["geocode_source"] = "nominatim"

        processed.append(job)

    return processed


def build_geojson_feature(job: dict) -> dict | None:
    """Convert a processed job dict to a GeoJSON Feature."""
    if "lat" not in job:
        return None

    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [job["lng"], job["lat"]],
        },
        "properties": {
            "id": job.get("_id", ""),
            "title": job.get("job_title", ""),
            "company": job.get("company_name", ""),
            "source": job.get("_source", ""),
            "address": job.get("location") or job.get("job_location", ""),
            "geocode_source": job.get("geocode_source", ""),
            "geocode_address": job.get("geocode_address", ""),
            "job_type": job.get("job_type") or job.get("job_employment_type", ""),
            "salary": job.get("salary_formatted") or job.get("job_base_pay_range", ""),
            "seniority": job.get("job_seniority_level", ""),
            "industry": job.get("job_industries") or job.get("job_function", ""),
            "applicants": job.get("job_num_applicants"),
            "posted": job.get("date_posted_parsed") or job.get("job_posted_date", ""),
            "url": job.get("url", ""),
            "apply_link": job.get("apply_link", ""),
            "skills": job.get("skills", {}),
            "skill_summary": job.get("skill_summary", ""),
            "benefits": job.get("benefits", []),
            "company_rating": job.get("company_rating"),
            "scraped_at": job.get("_scraped_at", ""),
        },
    }


def save_job_results(features: list[dict]) -> None:
    """Save GeoJSON + append to history. Deduplicates by job ID."""
    jobs_file = OUTPUT_FILES["jobs"]
    history_file = OUTPUT_FILES["jobs_history"]
    jobs_file.parent.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    existing_ids: set[str] = set()
    existing_features: list[dict] = []
    if jobs_file.exists():
        with open(jobs_file) as f:
            existing = json.load(f)
            existing_features = existing.get("features", [])
            existing_ids = {f["properties"]["id"] for f in existing_features}

    new_ids = {f["properties"]["id"] for f in features}
    kept = [f for f in existing_features if f["properties"]["id"] not in new_ids]
    merged = kept + features

    geojson = {"type": "FeatureCollection", "features": merged}
    with open(jobs_file, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    with open(history_file, "a", encoding="utf-8") as f:
        for feat in features:
            f.write(json.dumps(feat) + "\n")

    added = len(new_ids - existing_ids)
    updated = len(new_ids & existing_ids)
    print(f"\nSaved: {jobs_file}")
    print(f"  Total features: {len(merged)}")
    print(f"  New: {added}, Updated: {updated}, Existing kept: {len(kept)}")
