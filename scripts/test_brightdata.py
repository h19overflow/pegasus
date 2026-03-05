"""Test Bright Data API integration — Indeed + LinkedIn job scrapers for Montgomery AL."""

import json
import time
import urllib.request
import urllib.error
import sys

API_KEY = "1f7ca8eb-5b67-45a0-8ae8-5f7087141477"
BASE_URL = "https://api.brightdata.com/datasets/v3"


def api_request(method: str, path: str, params: dict = None, body: list | dict = None) -> dict:
    """Make an authenticated request to Bright Data API."""
    url = f"{BASE_URL}/{path}"
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
        body_text = e.read().decode() if e.readable() else ""
        return {"status": e.code, "error": body_text}


def trigger_scraper(dataset_id: str, payload: list, extra_params: dict = None) -> str | None:
    """Trigger a scraper and return the snapshot_id."""
    params = {"dataset_id": dataset_id, "format": "json", "include_errors": "true"}
    if extra_params:
        params.update(extra_params)

    result = api_request("POST", "trigger", params=params, body=payload)
    print(f"  Status: {result['status']}")

    if result["status"] == 200:
        snapshot_id = result["data"]["snapshot_id"]
        print(f"  Snapshot ID: {snapshot_id}")
        return snapshot_id

    print(f"  Error: {result.get('error', result.get('data'))}")
    return None


def poll_until_ready(snapshot_id: str, max_wait: int = 300) -> bool:
    """Poll snapshot progress until ready or timeout."""
    elapsed = 0
    interval = 15

    while elapsed < max_wait:
        result = api_request("GET", f"progress/{snapshot_id}")
        if result["status"] != 200:
            print(f"  Poll error: {result}")
            return False

        status = result["data"].get("status", "unknown")
        print(f"  [{elapsed}s] Status: {status}")

        if status == "ready":
            return True
        if status == "failed":
            print(f"  FAILED: {result['data']}")
            return False

        time.sleep(interval)
        elapsed += interval

    print(f"  Timed out after {max_wait}s")
    return False


def download_snapshot(snapshot_id: str) -> list | None:
    """Download snapshot results."""
    result = api_request("GET", f"snapshot/{snapshot_id}", params={"format": "json"})

    if result["status"] == 200:
        return result["data"]

    print(f"  Download error: {result}")
    return None


def run_test():
    """Run the full test: trigger Indeed + LinkedIn, poll, download, display."""

    # === Test 1: Indeed Jobs — Discovery by keyword ===
    # Required fields from API validation error:
    #   country, domain, keyword_search, location (required)
    #   date_posted, posted_by, location_radius (optional)
    print("=" * 60)
    print("TEST 1: Indeed Jobs — Montgomery AL (discovery mode)")
    print("=" * 60)

    indeed_id = trigger_scraper(
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

    # === Test 2: LinkedIn Jobs — Discovery by keyword ===
    # Required fields from API validation error:
    #   location (required)
    #   keyword, country, time_range, job_type, experience_level,
    #   remote, company, location_radius (optional)
    print()
    print("=" * 60)
    print("TEST 2: LinkedIn Jobs — Montgomery AL (discovery mode)")
    print("=" * 60)

    linkedin_id = trigger_scraper(
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

    # === Poll both ===
    results = {}

    for name, snap_id in [("Indeed", indeed_id), ("LinkedIn", linkedin_id)]:
        if not snap_id:
            print(f"\n{name}: Skipped (trigger failed)")
            continue

        print(f"\n--- Polling {name} ({snap_id}) ---")
        if poll_until_ready(snap_id):
            print(f"  Downloading {name} results...")
            data = download_snapshot(snap_id)
            if data:
                results[name] = data
                print(f"  Got {len(data)} records")
            else:
                print(f"  Download failed")
        else:
            print(f"  {name} did not complete in time")

    # === Display results ===
    for name, records in results.items():
        print()
        print("=" * 60)
        print(f"RESULTS: {name} — {len(records)} jobs")
        print("=" * 60)

        # Show full first record
        if records:
            print(f"\n--- First record (all fields) ---")
            print(json.dumps(records[0], indent=2, default=str))

        # Show summary of all records
        print(f"\n--- All {len(records)} records summary ---")
        for i, rec in enumerate(records):
            title = rec.get("job_title") or rec.get("title") or "N/A"
            company = rec.get("company_name") or rec.get("company") or "N/A"
            location = rec.get("job_location") or rec.get("location") or "N/A"
            print(f"  {i+1}. {title} @ {company} — {location}")

    # Save full output
    output_path = "C:/Users/User/Projects/Pegasus/scripts/test_brightdata_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nFull results saved to: {output_path}")


if __name__ == "__main__":
    run_test()
