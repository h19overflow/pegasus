"""
Daily Job Scraper Service for MontgomeryAI.

Architecture:
  1. TRIGGER: Fires Indeed + LinkedIn + Glassdoor scrapers via Bright Data Web Scraper API
  2. DELIVER: Bright Data POSTs results to our webhook endpoint (or we poll as fallback)
  3. PROCESS: Skill extraction → ArcGIS geocoding → GeoJSON output
  4. STORE:   Deduped results saved to jobs_latest.geojson + jobs_history.jsonl

Usage:
  # Start webhook receiver (run in background)
  python job_scraper_service.py serve --port 8787

  # Trigger a scrape (manual or via cron)
  python job_scraper_service.py trigger

  # Trigger + poll (no webhook needed, for testing)
  python job_scraper_service.py trigger --poll

  # Process a raw Bright Data JSON file directly
  python job_scraper_service.py process --input raw_jobs.json
"""

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_KEY = os.environ.get(
    "BRIGHTDATA_API_KEY", "1f7ca8eb-5b67-45a0-8ae8-5f7087141477"
)
BD_BASE = "https://api.brightdata.com/datasets/v3"
ARCGIS_BASE = "https://gis.montgomeryal.gov/server/rest/services"

DATA_DIR = Path(__file__).parent / "data"
LATEST_FILE = DATA_DIR / "jobs_latest.geojson"
HISTORY_FILE = DATA_DIR / "jobs_history.jsonl"
RAW_DIR = DATA_DIR / "raw"

SCRAPERS = [
    {
        "name": "Indeed",
        "dataset_id": "gd_l4dx9j9sscpvs7no2",
        "payload": [{
            "country": "US",
            "domain": "indeed.com",
            "keyword_search": "jobs",
            "location": "Montgomery, AL",
        }],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "150",
        },
    },
    {
        "name": "LinkedIn",
        "dataset_id": "gd_lpfll7v5hcqtkxl6l",
        "payload": [{
            "keyword": "jobs",
            "location": "Montgomery, Alabama, United States",
            "country": "US",
        }],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "150",
        },
    },
    {
        "name": "Glassdoor",
        "dataset_id": "gd_lpfbbndm1xnopbrcr0",
        "payload": [{
            "keyword": "jobs",
            "location": "Montgomery, Alabama",
        }],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "150",
        },
    },
]

SKILL_CATEGORIES = {
    "education": [
        "high school", "ged", "bachelor", "associate", "master", "diploma",
        "degree", "college", "university", "certification", "licensed",
    ],
    "technical": [
        "cdl", "forklift", "hvac", "welding", "electrical", "plumbing",
        "mechanical", "cnc", "autocad", "microsoft office", "excel",
        "computer", "software", "programming", "python", "sql", "data entry",
    ],
    "healthcare": [
        "cna", "rn", "lpn", "nursing", "cpr", "first aid", "patient care",
        "medical", "phlebotomy", "emt", "pharmacy", "clinical",
    ],
    "soft_skills": [
        "communication", "teamwork", "leadership", "customer service",
        "problem solving", "time management", "detail oriented",
        "organizational", "multitask",
    ],
    "experience": [
        "1 year", "2 year", "3 year", "5 year", "experience required",
        "entry level", "no experience", "years of experience",
    ],
    "physical": [
        "lifting", "standing", "physical", "warehouse", "manual labor",
        "outdoors", "driving", "travel",
    ],
    "clearance": [
        "background check", "drug test", "drug screen", "security clearance",
        "fingerprint",
    ],
}


# ---------------------------------------------------------------------------
# Bright Data API
# ---------------------------------------------------------------------------

def bright_data_request(
    method: str, path: str,
    params: dict | None = None,
    body: list | dict | None = None,
) -> dict:
    """Make authenticated Bright Data API request."""
    url = f"{BD_BASE}/{path}"
    if params:
        query = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
        url = f"{url}?{query}"

    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    if data:
        req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return {"status": resp.status, "data": json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "error": e.read().decode()}


def trigger_scraper(
    scraper: dict,
    webhook_url: str | None = None,
) -> str | None:
    """Trigger a Bright Data scraper. Returns snapshot_id."""
    params = {
        "dataset_id": scraper["dataset_id"],
        "format": "json",
        "include_errors": "true",
    }
    params.update(scraper["params"])

    if webhook_url:
        params["notify"] = webhook_url

    result = bright_data_request("POST", "trigger", params=params, body=scraper["payload"])

    if result["status"] == 200:
        snapshot_id = result["data"]["snapshot_id"]
        print(f"  [{scraper['name']}] Triggered: {snapshot_id}")
        return snapshot_id

    print(f"  [{scraper['name']}] FAILED: {result}")
    return None


def poll_snapshot(snapshot_id: str, max_wait: int = 600) -> list[dict]:
    """Poll until ready, then download results."""
    elapsed = 0
    while elapsed < max_wait:
        progress = bright_data_request("GET", f"progress/{snapshot_id}")
        status = progress.get("data", {}).get("status", "unknown")
        print(f"    [{elapsed}s] {status}")

        if status == "ready":
            dl = bright_data_request(
                "GET", f"snapshot/{snapshot_id}",
                params={"format": "json"},
            )
            records = dl.get("data", [])
            valid = [r for r in records if r.get("job_title") and not r.get("error")]
            print(f"    Downloaded: {len(valid)} valid records")
            return valid

        if status == "failed":
            print("    FAILED")
            return []

        time.sleep(15)
        elapsed += 15

    print("    Timed out")
    return []


# ---------------------------------------------------------------------------
# Processing pipeline
# ---------------------------------------------------------------------------

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
    """Full pipeline: tag source → extract skills → geocode → structure."""
    arcgis_cache: dict = {}
    nominatim_cache: dict = {}

    processed = []
    for job in raw_jobs:
        job["_source"] = source.lower()
        job["_id"] = generate_job_id(job)
        job["_scraped_at"] = datetime.now(timezone.utc).isoformat()

        # Skill extraction
        desc = job.get("description_text") or job.get("description") or job.get("job_summary") or ""
        desc_clean = re.sub(r"<[^>]+>", " ", desc)
        skills = extract_skills(desc_clean)
        job["skills"] = skills
        all_skills = []
        for cat_skills in skills.values():
            all_skills.extend(cat_skills)
        job["skill_summary"] = ", ".join(all_skills)

        # Geocoding — ArcGIS first, then Nominatim
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


def save_results(features: list[dict]) -> None:
    """Save GeoJSON + append to history. Deduplicates by job ID."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    # Load existing features for dedup
    existing_ids: set[str] = set()
    existing_features: list[dict] = []
    if LATEST_FILE.exists():
        with open(LATEST_FILE) as f:
            existing = json.load(f)
            existing_features = existing.get("features", [])
            existing_ids = {f["properties"]["id"] for f in existing_features}

    # Merge — new features override existing with same ID
    new_ids = {f["properties"]["id"] for f in features}
    kept = [f for f in existing_features if f["properties"]["id"] not in new_ids]
    merged = kept + features

    geojson = {"type": "FeatureCollection", "features": merged}
    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    # Append new to history
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        for feat in features:
            f.write(json.dumps(feat) + "\n")

    added = len(new_ids - existing_ids)
    updated = len(new_ids & existing_ids)
    print(f"\nSaved: {LATEST_FILE}")
    print(f"  Total features: {len(merged)}")
    print(f"  New: {added}, Updated: {updated}, Existing kept: {len(kept)}")


# ---------------------------------------------------------------------------
# Webhook server (FastAPI)
# ---------------------------------------------------------------------------

def run_webhook_server(port: int) -> None:
    """Start FastAPI webhook receiver."""
    try:
        from http.server import HTTPServer, BaseHTTPRequestHandler
    except ImportError:
        print("ERROR: http.server not available")
        sys.exit(1)

    class WebhookHandler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            try:
                raw_jobs = json.loads(body)
                print(f"\n[WEBHOOK] Received {len(raw_jobs)} records")

                # Save raw
                ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
                raw_file = RAW_DIR / f"webhook_{ts}.json"
                RAW_DIR.mkdir(parents=True, exist_ok=True)
                with open(raw_file, "w") as f:
                    json.dump(raw_jobs, f, indent=2)
                print(f"  Raw saved: {raw_file}")

                # Determine source from data shape
                source = detect_source(raw_jobs)

                # Process
                valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
                processed = process_jobs(valid, source)

                features = []
                for job in processed:
                    feat = build_geojson_feature(job)
                    if feat:
                        features.append(feat)

                save_results(features)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "processed": len(features)}).encode())

            except Exception as e:
                print(f"  [WEBHOOK] Error: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())

        def log_message(self, format: str, *args: object) -> None:
            pass  # Suppress default logging

    server = HTTPServer(("0.0.0.0", port), WebhookHandler)
    print(f"Webhook server listening on http://0.0.0.0:{port}")
    print("Bright Data will POST results to this endpoint.\n")
    server.serve_forever()


# ---------------------------------------------------------------------------
# CLI commands
# ---------------------------------------------------------------------------

def cmd_trigger(args: argparse.Namespace) -> None:
    """Trigger all scrapers."""
    webhook_url = args.webhook if hasattr(args, "webhook") and args.webhook else None
    use_poll = args.poll if hasattr(args, "poll") else False

    print("=" * 60)
    print(f"TRIGGERING SCRAPERS — {datetime.now().isoformat()}")
    if webhook_url:
        print(f"Webhook: {webhook_url}")
    elif use_poll:
        print("Mode: poll (will wait for results)")
    print("=" * 60)

    all_features: list[dict] = []

    for scraper in SCRAPERS:
        print(f"\n[{scraper['name']}]")
        snapshot_id = trigger_scraper(scraper, webhook_url=webhook_url)

        if snapshot_id and use_poll:
            raw_jobs = poll_snapshot(snapshot_id)
            if raw_jobs:
                # Save raw
                RAW_DIR.mkdir(parents=True, exist_ok=True)
                ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
                raw_file = RAW_DIR / f"{scraper['name'].lower()}_{ts}.json"
                with open(raw_file, "w") as f:
                    json.dump(raw_jobs, f, indent=2)

                processed = process_jobs(raw_jobs, scraper["name"])
                for job in processed:
                    feat = build_geojson_feature(job)
                    if feat:
                        all_features.append(feat)

    if use_poll and all_features:
        save_results(all_features)

    if webhook_url:
        print("\nScrapers triggered. Results will be delivered via webhook.")


def cmd_process(args: argparse.Namespace) -> None:
    """Process a raw JSON file through the pipeline."""
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"File not found: {input_path}")
        sys.exit(1)

    with open(input_path) as f:
        raw_data = json.load(f)

    # Handle both flat arrays and {Indeed: [...], LinkedIn: [...]} format
    if isinstance(raw_data, dict):
        all_jobs = []
        for source_name, records in raw_data.items():
            for r in records:
                r["_source_hint"] = source_name.lower()
            all_jobs.extend(records)
    else:
        all_jobs = raw_data

    valid = [r for r in all_jobs if r.get("job_title") and not r.get("error")]
    print(f"Processing {len(valid)} valid jobs from {input_path}\n")

    processed = process_jobs(valid, "manual")
    features = []
    for job in processed:
        feat = build_geojson_feature(job)
        if feat:
            features.append(feat)

    save_results(features)


def cmd_serve(args: argparse.Namespace) -> None:
    """Start webhook server."""
    run_webhook_server(args.port)


def main() -> None:
    parser = argparse.ArgumentParser(description="MontgomeryAI Job Scraper Service")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # trigger
    trigger_parser = subparsers.add_parser("trigger", help="Trigger Bright Data scrapers")
    trigger_parser.add_argument("--webhook", type=str, help="Webhook URL for delivery")
    trigger_parser.add_argument("--poll", action="store_true", help="Poll for results instead of webhook")
    trigger_parser.set_defaults(func=cmd_trigger)

    # process
    process_parser = subparsers.add_parser("process", help="Process raw JSON through pipeline")
    process_parser.add_argument("--input", type=str, required=True, help="Input JSON file")
    process_parser.set_defaults(func=cmd_process)

    # serve
    serve_parser = subparsers.add_parser("serve", help="Start webhook receiver")
    serve_parser.add_argument("--port", type=int, default=8787, help="Port number")
    serve_parser.set_defaults(func=cmd_serve)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
