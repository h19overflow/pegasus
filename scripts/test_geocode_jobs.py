"""Geocode job results from Bright Data using Nominatim (free, no API key)."""

import json
import urllib.request
import urllib.parse
import time

INPUT_FILE = "scripts/test_brightdata_results.json"
OUTPUT_FILE = "scripts/test_geocoded_jobs.json"


def load_job_locations(filepath: str) -> list[dict]:
    """Extract unique locations from Bright Data results."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    jobs = []
    for source in ["Indeed", "LinkedIn"]:
        for rec in data.get(source, []):
            if rec.get("error") and not rec.get("job_title"):
                continue

            loc = rec.get("location") or rec.get("job_location")
            if not loc or loc == "United States":
                continue

            jobs.append({
                "title": rec.get("job_title", "N/A"),
                "company": rec.get("company_name", "N/A"),
                "source": source,
                "address": loc,
                "job_type": rec.get("job_type") or rec.get("job_employment_type", ""),
                "salary": rec.get("salary_formatted") or rec.get("base_salary", ""),
                "seniority": rec.get("job_seniority_level", ""),
                "industry": rec.get("job_industries") or rec.get("job_function", ""),
                "url": rec.get("url") or rec.get("apply_link", ""),
            })

    return jobs


def geocode_address(address: str) -> tuple[float, float] | None:
    """Geocode an address using Nominatim. Returns (lat, lng) or None."""
    query = urllib.parse.quote(address)
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1&countrycodes=us"

    req = urllib.request.Request(url)
    req.add_header("User-Agent", "MontgomeryAI-Hackathon/1.0")

    with urllib.request.urlopen(req, timeout=10) as resp:
        results = json.loads(resp.read().decode())

    if results:
        return float(results[0]["lat"]), float(results[0]["lon"])
    return None


def geocode_all_jobs(jobs: list[dict]) -> list[dict]:
    """Geocode all jobs, respecting Nominatim 1 req/sec rate limit."""
    cache = {}

    for job in jobs:
        addr = job["address"]

        if addr in cache:
            coords = cache[addr]
        else:
            try:
                coords = geocode_address(addr)
                cache[addr] = coords
                time.sleep(1)  # Nominatim rate limit
            except Exception as e:
                print(f"  ERR  {addr}: {e}")
                coords = None
                cache[addr] = None

        if coords:
            job["lat"] = coords[0]
            job["lng"] = coords[1]
            print(f"  OK   {job['title'][:35]:<35} -> {coords[0]:.5f}, {coords[1]:.5f}")
        else:
            print(f"  MISS {job['title'][:35]:<35} -> no coords for '{addr}'")

    return jobs


def build_geojson(jobs: list[dict]) -> dict:
    """Build a GeoJSON FeatureCollection from geocoded jobs."""
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
                "title": job["title"],
                "company": job["company"],
                "source": job["source"],
                "address": job["address"],
                "job_type": job["job_type"],
                "salary": job["salary"],
                "seniority": job["seniority"],
                "industry": job["industry"],
                "url": job["url"],
            },
        })

    return {"type": "FeatureCollection", "features": features}


def main():
    print("Loading job results...")
    jobs = load_job_locations(INPUT_FILE)
    print(f"Found {len(jobs)} jobs with locations\n")

    print("Geocoding (Nominatim, 1 req/sec)...")
    geocode_all_jobs(jobs)

    geocoded = [j for j in jobs if "lat" in j]
    print(f"\nGeocoded: {len(geocoded)}/{len(jobs)}\n")

    # Build GeoJSON
    geojson = build_geojson(jobs)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print(f"GeoJSON saved to {OUTPUT_FILE}")
    print(f"Features: {len(geojson['features'])}\n")

    # Print map-ready summary
    print("=" * 70)
    print(f"{'Source':<10} {'Lat':>9} {'Lng':>10}  {'Title':<30} {'Company'}")
    print("=" * 70)
    for feat in geojson["features"]:
        p = feat["properties"]
        c = feat["geometry"]["coordinates"]
        print(f"{p['source']:<10} {c[1]:>9.5f} {c[0]:>10.5f}  {p['title'][:30]:<30} {p['company']}")


if __name__ == "__main__":
    main()
