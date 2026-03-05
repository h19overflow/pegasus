# MontgomeryAI — Proven Capabilities & Possibilities

> **Date:** 2026-03-05
>
> **Status:** All integrations tested end-to-end with live data.

---

## What Works Today (Proven)

### 1. Montgomery ArcGIS — 31 Public Endpoints

All 31 city datasets verified live and returning valid GeoJSON. No auth required.

**Key datasets for our use case:**

| Dataset | Records | Why It Matters |
|---------|---------|---------------|
| Business Licenses | 122,000+ | Geocode employers by company name (SQL LIKE query) |
| Building Permits | 15,000+ | Construction activity = job creation signal |
| Open Payroll | 3,000+ | City salary benchmarks by department/title |
| Open Checkbook | 50,000+ | Budget allocation = sector investment signal |
| Crime Statistics | 30,000+ | Safety context for job locations |
| City Recreation | 200+ | Community resources for civic guide |

**Full reference:** `docs/data-catalog.md` — every endpoint with copy-paste URLs, verified field names, and gotchas.

### 2. Bright Data Job Scraping — Indeed + LinkedIn

Live-tested with real API calls. Both scrapers return rich structured data.

| Source | Dataset ID | Records | Quality |
|--------|-----------|---------|---------|
| Indeed | `gd_l4dx9j9sscpvs7no2` | 10 per trigger | Full descriptions, street addresses, benefits, salary |
| LinkedIn | `gd_lpfll7v5hcqtkxl6l` | 10 per trigger | Seniority level, industry, applicant count, structured salary |

**Trigger → Poll → Download flow works.** Typical latency: 30–90 seconds per batch.

**Payload (Indeed):**
```json
{"country": "US", "domain": "indeed.com", "keyword_search": "jobs", "location": "Montgomery, AL"}
```

**Payload (LinkedIn):**
```json
{"keyword": "jobs", "location": "Montgomery, Alabama, United States", "country": "US"}
```

**Full reference:** `docs/bright-data-integration.md`

### 3. Multi-Strategy Geocoding Pipeline

Three-tier geocoding tested on 20 jobs — **100% geocoded.**

| Strategy | How It Works | Precision | Matches |
|----------|-------------|-----------|---------|
| ArcGIS Business License | SQL LIKE on `custCOMPANY_NAME` across 122K records | Street address | 4/20 |
| Nominatim (OSM) | Free geocoder, 1 req/sec rate limit | Varies | 16/20 |
| City centroid fallback | Hardcoded Montgomery coords | City-level | 0 (unused) |

**ArcGIS matched:** Jackson Hospital, Viscofan USA, Costco, Dasmen Residential — all to precise business addresses.

### 4. Keyword-Based Skill Extraction

Seven skill categories, 70+ keywords. Tested on 20 job descriptions — **19/20 matched at least one skill.**

| Category | Example Keywords | Purpose |
|----------|-----------------|---------|
| education | bachelor, certification, licensed | Qualification barriers |
| technical | cdl, hvac, excel, python, sql | Hard skill matching |
| healthcare | cna, rn, nursing, cpr, phlebotomy | Sector-specific skills |
| soft_skills | communication, leadership, customer service | Transferable skills |
| experience | entry level, 3 year, no experience | Experience barriers |
| physical | lifting, warehouse, driving | Physical requirements |
| clearance | background check, drug test | Compliance requirements |

### 5. Full Pipeline: Scrape → Skills → Geocode → GeoJSON

End-to-end pipeline proven in `scripts/test_full_job_pipeline.py`:

```
Bright Data API (Indeed + LinkedIn)
        ↓
  Skill extraction (keyword NLP)
        ↓
  Geocoding (ArcGIS Business License → Nominatim fallback)
        ↓
  GeoJSON FeatureCollection (map-ready)
```

**Output per feature:** title, company, source, address, geocode source, job type, salary, seniority, industry, applicant count, posted date, URL, apply link, skills (categorized), benefits.

---

## What's Possible (Planned)

### Workforce Intelligence Dashboard

The pipeline above feeds a map-based dashboard where users see:

1. **Job Map** — Every scraped job plotted on a Leaflet map with skill metadata popups
2. **Trending Skills** — Aggregate skill counts across all jobs to show what Montgomery employers actually ask for
3. **Sector Heatmap** — Cluster jobs by industry/location to show where economic activity concentrates
4. **Salary Intelligence** — Compare salaries by role, seniority, and sector using Indeed + LinkedIn + Open Payroll data
5. **Personal Matching** — User inputs their skills/experience → system highlights which jobs they qualify for and what gaps to close

### Enrichment Layers (ArcGIS)

Layer city data on top of the job map:

| Layer | Insight |
|-------|---------|
| Building Permits | Where new construction = new jobs coming |
| Open Checkbook | Which city departments are spending (hiring signal) |
| Open Payroll | City job salary benchmarks |
| Crime Statistics | Safety context around workplaces |
| Bus Routes + Stops | Can the user actually get to the job? |
| City Recreation | Nearby community resources |

### Upskilling Recommendations

With skill gap data (user profile vs. job requirements), the system can:

- Rank jobs by "closeness of fit" — how many skills overlap vs. how many are missing
- Identify the **top 3 skills** that would unlock the most job opportunities if acquired
- Suggest specific certifications or training (e.g., "Getting a CDL opens 5 more jobs in your area")
- Track skill trends over time — what's growing, what's declining

### CivicGuide (Civic Access Track)

Separate agent that helps residents navigate city services. Requires Bright Data scraping of:

- Alabama Medicaid eligibility rules
- Alabama DHR (SNAP, TANF, childcare)
- Montgomery city permit application guides
- Alabama 211 community resource directory

The ArcGIS pipeline and RAG infrastructure are shared between both agents.

---

## Credentials Configured

| Service | Status | Config |
|---------|--------|--------|
| Bright Data API Key | Ready | `.env` → `BRIGHTDATA_API_KEY` |
| Bright Data Scraping Browser | Ready | `.env` → `BRIGHTDATA_BROWSER_WSS` |
| Bright Data SERP API | Ready | `.env` → `BRIGHTDATA_SERP_ZONE` |
| Bright Data MCP Server | Ready | `.env` → `BRIGHTDATA_MCP_URL` (5K free req/month) |
| Montgomery ArcGIS | Ready | No auth needed |
| Web Unlocker | Not configured | Zone not yet created |

---

## Test Artifacts

| File | Contents |
|------|----------|
| `scripts/test_brightdata.py` | API test — trigger Indeed + LinkedIn scrapers |
| `scripts/test_geocode_jobs.py` | Nominatim geocoder test |
| `scripts/test_full_job_pipeline.py` | Full 4-step pipeline (scrape → skills → geocode → GeoJSON) |
| `scripts/test_brightdata_results.json` | Raw Indeed + LinkedIn job data |
| `scripts/test_geocoded_jobs.json` | GeoJSON with Nominatim coords |
| `scripts/test_full_pipeline_results.json` | Final GeoJSON — 20 features with skills + multi-source geocoding |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    MontgomeryAI Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: City Data (ArcGIS → DuckDB)                      │
│  ├── 31 public endpoints, cached locally                   │
│  ├── Business Licenses as geocoder (122K records)          │
│  └── SQL queries over structured city data                 │
│                                                             │
│  Layer 2: Live Web Data (Bright Data)                       │
│  ├── Indeed + LinkedIn job scrapers                        │
│  ├── Government benefit sites (CivicGuide)                 │
│  └── SERP API for supplemental search                      │
│                                                             │
│  Processing Pipeline                                        │
│  ├── Skill extraction (keyword NLP → future: spaCy + O*NET)│
│  ├── Multi-strategy geocoding                              │
│  └── GeoJSON output for map rendering                      │
│                                                             │
│  Frontend: Leaflet map + dashboard panels                   │
│  ├── Job map with skill popups                             │
│  ├── Trending skills aggregation                           │
│  ├── Personal skill-gap matching                           │
│  └── City data overlay (permits, transit, safety)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## What's Not Yet Built

| Item | Effort | Notes |
|------|--------|-------|
| DuckDB local cache for ArcGIS data | Small | ETL script to bulk-load 31 endpoints |
| Scheduled job scraping (not just one-shot) | Small | Cron or on-demand trigger with dedup |
| spaCy NER + O*NET skill matching | Medium | Replace keyword matching with proper NLP |
| User profile → job matching engine | Medium | Cosine similarity on skill vectors |
| Leaflet map frontend | Medium | React component with GeoJSON layer |
| Trending skills aggregation | Small | Count skills across time-windowed scrapes |
| CivicGuide scraping targets | Medium | Medicaid, DHR, 211 — need Web Unlocker |
| LangChain ReAct agents | Large | CivicGuide + CareerPath conversational agents |
