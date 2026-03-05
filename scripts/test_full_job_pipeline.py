"""
Full job pipeline test:
1. Scrape jobs from Indeed + LinkedIn (Bright Data)
2. Geocode by company address lookup (ArcGIS Business Licenses → 122K records)
3. Extract skills from job descriptions (keyword-based)
4. Output map-ready GeoJSON with skills metadata
"""

import json
import re
import time
import urllib.request
import urllib.parse

API_KEY = "1f7ca8eb-5b67-45a0-8ae8-5f7087141477"
BD_BASE = "https://api.brightdata.com/datasets/v3"
ARCGIS_BASE = "https://gis.montgomeryal.gov/server/rest/services"


# ---------------------------------------------------------------------------
# Step 0: Skill taxonomy (common Montgomery-relevant skills)
# ---------------------------------------------------------------------------

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


def extract_skills(description: str) -> dict[str, list[str]]:
    """Extract skills from job description text using keyword matching."""
    if not description:
        return {}

    text = description.lower()
    found = {}

    for category, keywords in SKILL_CATEGORIES.items():
        matches = [kw for kw in keywords if kw in text]
        if matches:
            found[category] = matches

    return found


# ---------------------------------------------------------------------------
# Step 1: Bright Data API helpers
# ---------------------------------------------------------------------------

def bright_data_request(method: str, path: str, params: dict = None,
                        body: list | dict = None) -> dict:
    """Make authenticated Bright Data API request."""
    url = f"{BD_BASE}/{path}"
    if params:
        query = "&".join(f"{k}={v}" for k, v in params.items())
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


def trigger_and_collect(dataset_id: str, payload: list,
                        extra_params: dict) -> list[dict]:
    """Trigger scraper, poll, download results."""
    params = {"dataset_id": dataset_id, "format": "json",
              "include_errors": "true"}
    params.update(extra_params)

    result = bright_data_request("POST", "trigger", params=params, body=payload)
    if result["status"] != 200:
        print(f"  Trigger failed: {result}")
        return []

    snapshot_id = result["data"]["snapshot_id"]
    print(f"  Snapshot: {snapshot_id}")

    # Poll
    elapsed = 0
    while elapsed < 300:
        progress = bright_data_request("GET", f"progress/{snapshot_id}")
        status = progress.get("data", {}).get("status", "unknown")
        print(f"  [{elapsed}s] {status}")

        if status == "ready":
            dl = bright_data_request("GET", f"snapshot/{snapshot_id}",
                                     params={"format": "json"})
            records = dl.get("data", [])
            good = [r for r in records if not r.get("error") or r.get("job_title")]
            good = [r for r in good if r.get("job_title")]
            print(f"  Downloaded: {len(good)} valid records")
            return good

        if status == "failed":
            print("  FAILED")
            return []

        time.sleep(15)
        elapsed += 15

    print("  Timed out")
    return []


# ---------------------------------------------------------------------------
# Step 2: ArcGIS Business License geocoder
# ---------------------------------------------------------------------------

def search_business_in_arcgis(company_name: str) -> tuple[float, float] | None:
    """Search ArcGIS Business Licenses for a company and return coordinates."""
    # Clean company name for search
    clean = company_name.upper().split(",")[0].strip()
    # Remove common suffixes
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

    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            features = data.get("features", [])
            if features:
                coords = features[0]["geometry"]["coordinates"]
                name = features[0]["properties"].get("custCOMPANY_NAME", "")
                addr = features[0]["properties"].get("Full_Address", "")
                return coords[1], coords[0], name, addr  # lat, lng, name, addr
    except Exception:
        pass

    return None


def geocode_via_nominatim(address: str) -> tuple[float, float] | None:
    """Fallback geocoder using Nominatim."""
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


def geocode_job(job: dict, arcgis_cache: dict, nominatim_cache: dict) -> dict:
    """Geocode a job using: 1) ArcGIS business lookup, 2) address, 3) city."""
    company = job.get("company_name", "")
    address = job.get("location") or job.get("job_location", "")

    # Strategy 1: ArcGIS Business License lookup (precise, real address)
    if company and company not in arcgis_cache:
        result = search_business_in_arcgis(company)
        arcgis_cache[company] = result
        time.sleep(0.3)  # Be gentle with ArcGIS

    arcgis_result = arcgis_cache.get(company)
    if arcgis_result:
        job["lat"] = arcgis_result[0]
        job["lng"] = arcgis_result[1]
        job["geocode_source"] = "arcgis_business_license"
        job["geocode_match"] = arcgis_result[2]
        job["geocode_address"] = arcgis_result[3]
        return job

    # Strategy 2: Nominatim on the job's address field
    if address and address not in nominatim_cache:
        result = geocode_via_nominatim(address)
        nominatim_cache[address] = result
        time.sleep(1)  # Nominatim rate limit

    nom_result = nominatim_cache.get(address)
    if nom_result:
        job["lat"] = nom_result[0]
        job["lng"] = nom_result[1]
        job["geocode_source"] = "nominatim"
        return job

    return job


# ---------------------------------------------------------------------------
# Step 3: Build GeoJSON
# ---------------------------------------------------------------------------

def build_geojson(jobs: list[dict]) -> dict:
    """Build GeoJSON FeatureCollection with skills metadata."""
    features = []
    for job in jobs:
        if "lat" not in job:
            continue

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [job["lng"], job["lat"]],
            },
            "properties": {
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
            },
        })

    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("STEP 1: Scrape jobs from Bright Data")
    print("=" * 60)

    print("\n[Indeed]")
    indeed_jobs = trigger_and_collect(
        dataset_id="gd_l4dx9j9sscpvs7no2",
        payload=[{
            "country": "US",
            "domain": "indeed.com",
            "keyword_search": "jobs",
            "location": "Montgomery, AL",
        }],
        extra_params={
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "10",
        },
    )
    for j in indeed_jobs:
        j["_source"] = "indeed"

    print("\n[LinkedIn]")
    linkedin_jobs = trigger_and_collect(
        dataset_id="gd_lpfll7v5hcqtkxl6l",
        payload=[{
            "keyword": "jobs",
            "location": "Montgomery, Alabama, United States",
            "country": "US",
        }],
        extra_params={
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "10",
        },
    )
    for j in linkedin_jobs:
        j["_source"] = "linkedin"

    all_jobs = indeed_jobs + linkedin_jobs
    print(f"\nTotal jobs: {len(all_jobs)}")

    # ----- Step 2: Extract skills -----
    print("\n" + "=" * 60)
    print("STEP 2: Extract skills from descriptions")
    print("=" * 60)

    for job in all_jobs:
        desc = (job.get("description_text") or job.get("description") or
                job.get("job_summary") or "")
        # Strip HTML if present
        desc_clean = re.sub(r"<[^>]+>", " ", desc)
        skills = extract_skills(desc_clean)
        job["skills"] = skills

        all_skills = []
        for cat_skills in skills.values():
            all_skills.extend(cat_skills)
        job["skill_summary"] = ", ".join(all_skills) if all_skills else ""

        title = job.get("job_title", "N/A")[:40]
        skill_count = sum(len(v) for v in skills.values())
        print(f"  {title:<40} -> {skill_count} skills: {job['skill_summary'][:60]}")

    # ----- Step 3: Geocode -----
    print("\n" + "=" * 60)
    print("STEP 3: Geocode (ArcGIS Business License → Nominatim fallback)")
    print("=" * 60)

    arcgis_cache = {}
    nominatim_cache = {}

    for job in all_jobs:
        geocode_job(job, arcgis_cache, nominatim_cache)
        title = job.get("job_title", "N/A")[:30]
        company = job.get("company_name", "N/A")[:20]
        source = job.get("geocode_source", "NONE")

        if "lat" in job:
            print(f"  {source:<25} {title:<30} {company:<20} -> {job['lat']:.5f}, {job['lng']:.5f}")
        else:
            print(f"  FAILED                  {title:<30} {company}")

    # ----- Step 4: Build GeoJSON -----
    print("\n" + "=" * 60)
    print("STEP 4: Build GeoJSON")
    print("=" * 60)

    geojson = build_geojson(all_jobs)
    geocoded_count = len(geojson["features"])
    arcgis_count = len([f for f in geojson["features"]
                        if f["properties"]["geocode_source"] == "arcgis_business_license"])
    nominatim_count = len([f for f in geojson["features"]
                           if f["properties"]["geocode_source"] == "nominatim"])

    print(f"  Total features: {geocoded_count}/{len(all_jobs)}")
    print(f"  ArcGIS matches: {arcgis_count} (precise business address)")
    print(f"  Nominatim:      {nominatim_count} (address/city fallback)")

    # Save
    output = "scripts/test_full_pipeline_results.json"
    with open(output, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)
    print(f"\n  Saved: {output}")

    # ----- Summary -----
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)

    for feat in geojson["features"]:
        p = feat["properties"]
        c = feat["geometry"]["coordinates"]
        skills = p.get("skill_summary", "")[:50]
        geo = p.get("geocode_source", "")[:8]
        print(
            f"  {p['source']:<8} {geo:<8} "
            f"{c[1]:>9.4f},{c[0]:>10.4f}  "
            f"{p['title'][:25]:<25} "
            f"{p['company'][:18]:<18} "
            f"skills: {skills}"
        )


if __name__ == "__main__":
    main()
