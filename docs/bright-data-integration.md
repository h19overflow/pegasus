# Bright Data — Integration Guide

> **Last updated:** 2026-03-06
>
> **Dashboard:** https://brightdata.com/cp
>
> **SDK:** `brightdata-sdk` v2.2.1 (Python)

---

## 1. Products We Use

| Product | What It Does | Our Use Case | SDK Method |
|---------|-------------|--------------|-----------|
| **Web Scraper API** | Pre-built scrapers for specific sites — trigger → poll → fetch | Jobs (Indeed, LinkedIn, Glassdoor), Housing (Zillow) | `DatasetAPIClient.trigger()` → `.get_status()` → `.fetch_result()` |
| **SERP API** | Structured Google search results with geo-targeting | News discovery — article titles, URLs, snippets | `client.search.google(query, location)` |
| **Crawl API** | Fetches any URL → returns markdown + HTML | Government benefit pages (Medicaid, SNAP, TANF) | Same trigger/poll/fetch with `dataset_id=gd_m6gjtfmeh43we6cqc` |

### Products We Don't Use

| Product | Why Not |
|---------|---------|
| **Web Unlocker** | No zone on our account; auto-create requires payment method. Crawl API replaces it. |
| **Scraping Browser** | We have a `scraping_browser1` zone but don't need browser automation. Uses WebSocket/Playwright. |
| **Proxies** | We don't manage our own scrapers. |
| **Datasets Marketplace** | Pre-collected bulk data — not needed for live scraping. |
| **MCP Server** | Could be useful for Claude tool calling but not integrated yet. |

### What We Scrape

| Data Need | Product | Dataset ID |
|-----------|---------|-----------|
| Indeed jobs | Web Scraper API | `gd_l4dx9j9sscpvs7no2` |
| LinkedIn jobs | Web Scraper API | `gd_lpfll7v5hcqtkxl6l` |
| Glassdoor jobs | Web Scraper API | `gd_lpfbbndm1xnopbrcr0` |
| Zillow housing | Web Scraper API | `gd_lfqkr8wm13ixtbd8f5` |
| Montgomery news | SERP API | (zone: `serp_api1`) |
| Benefit pages (Medicaid, SNAP, TANF) | Crawl API | `gd_m6gjtfmeh43we6cqc` |

---

## 2. Account & Zones

A **zone** is Bright Data's term for a named proxy/scraping channel. Each zone maps to a product type with its own credentials and billing.

Our account has **2 zones**:

| Zone Name | Product Type | Status |
|-----------|-------------|--------|
| `serp_api1` | SERP API | Active — used for news search |
| `scraping_browser1` | Browser API | Available but unused |

We use `auto_create_zones=False` in the SDK because zone creation requires a payment method (403 error).

### Authentication

All API calls use Bearer token auth:
```
Authorization: Bearer BRIGHTDATA_API_KEY
```

The SDK reads the token from `scripts/config.py:get_api_token()` which reads `BRIGHTDATA_API_KEY` from `.env`.

---

## 3. SDK Implementation

### Client Architecture

```
scripts/bright_data_client.py
├── _make_client()              ← Factory: SyncBrightDataClient(auto_create_zones=False)
├── trigger_and_collect()       ← Trigger → poll → fetch (unified pipeline)
├── trigger_scraper()           ← Fire-and-forget wrapper (backward compat)
├── poll_snapshot()             ← Poll-only wrapper (backward compat)
├── fetch_with_unlocker()       ← Page fetch via Crawl API dataset
└── serp_search()               ← Google News search via SDK SERP service
```

### How Each Function Works

**`trigger_and_collect(dataset_id, payload, params)`** — Used by job/housing scrapers. Opens a `SyncBrightDataClient`, creates a `DatasetAPIClient` from its engine, calls trigger → polls status every 15s → fetches results when ready. Returns `list[dict]`.

**`serp_search(query)`** — Opens a client, calls `client.search.google(query, location="Montgomery, AL", num_results=20)`. Returns `{"results": [...]}` compatible with `parse_news_results()`.

**`fetch_with_unlocker(url)`** — Calls `trigger_and_collect()` with the crawl dataset ID. Returns the `markdown` field from the first result.

### Thread Safety

Each public function creates its own `SyncBrightDataClient` in a `with` block. The SDK creates its own event loop per instance. This is safe because `scrape_scheduler.py` runs each stream in a separate thread via `ThreadPoolExecutor`.

### Why Crawl API Replaced Web Unlocker

1. Our account has no Web Unlocker zone (`web_unlocker1` doesn't exist in dashboard)
2. SDK's `auto_create_zones` fails with 403 (payment method required)
3. Crawl API (`gd_m6gjtfmeh43we6cqc`) accepts any URL, returns markdown directly, needs no zone

### Verified Results (2026-03-06)

| Function | Test Result |
|----------|-------------|
| `serp_search("Montgomery Alabama news today")` | 20 results, 7.7 KB |
| `fetch_with_unlocker("https://medicaid.alabama.gov")` | 29,633 chars of markdown |
| `trigger_and_collect(indeed_dataset_id, ...)` | 18 job records, 250 KB |

---

## 4. Web Scraper API — Core Flow

All dataset scrapers (jobs, housing, crawl) use the same async pipeline:

```
1. POST /datasets/v3/trigger     → returns snapshot_id
2. GET  /datasets/v3/progress/{id} → poll until status = "ready"
3. GET  /datasets/v3/snapshot/{id} → download results as JSON
```

Our SDK wraps this via `DatasetAPIClient` from `brightdata.scrapers.api_client`.

### Discovery Mode

Job scrapers use keyword discovery instead of explicit URLs:

```json
[{"keyword": "jobs", "location": "Montgomery, Alabama"}]
```

With params: `type=discover_new`, `discover_by=keyword`, `limit_per_input=500`.

### Dataset Output Fields

**Indeed Jobs:** `jobid`, `company_name`, `date_posted_parsed`, `job_title`, `description_text`, `benefits`, `qualifications`, `job_type`

**LinkedIn Jobs:** `job_posting_id`, `job_title`, `company_name`, `job_location`, `job_description`, `job_seniority_level`, `job_summary`

**Glassdoor Jobs:** `company_name`, `company_rating`, `job_title`, `job_location`, `overview`, `headquarters`

**Zillow Housing:** Property listing details (address, price, beds, baths, sqft, etc.)

**Crawl API:** `markdown`, `html2text`, `page_html`, `ld_json`, `page_title`, `timestamp`

---

## 5. Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│            LAYER 1: DASHBOARD (Cached)               │
│  Source:  ArcGIS REST API → static JSON              │
│  Answer:  "What exists in Montgomery?"               │
│           Facilities, services, boundaries            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            LAYER 2: LIVE DATA (Bright Data)          │
│  Source:  SDK → trigger/poll/fetch pipeline           │
│  Answer:  "What's happening RIGHT NOW?"              │
│           Jobs, news, benefits, housing               │
└─────────────────────────────────────────────────────┘
```

### Data Gap Summary

ArcGIS covers physical infrastructure. Bright Data fills everything else:

| Gap | Bright Data Solution |
|-----|---------------------|
| Jobs & Employment | Web Scraper API (Indeed/LinkedIn/Glassdoor) |
| Benefits Eligibility | Crawl API (Medicaid, SNAP, TANF pages) |
| Housing | Web Scraper API (Zillow) |
| News | SERP API (Google News) |
| Events | Crawl API (city website) |

---

## 6. Config Reference

```
scripts/config.py
├── get_api_key()     ← Reads BRIGHTDATA_API_KEY from .env
├── get_api_token()   ← Alias for SDK
├── SERP_ZONE         ← "serp_api1"
├── UNLOCKER_ZONE     ← "web_unlocker1" (unused — no zone exists)
└── DATASETS          ← {indeed, linkedin, glassdoor_jobs, glassdoor_reviews, zillow, crawl}
```

### Pricing (for reference)

| Product | Price |
|---------|-------|
| Web Scraper API | $1.50/1K records |
| SERP API | $1.50/1K results |
| Crawl API | $1/1K requests |
