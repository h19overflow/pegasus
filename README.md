# Pegasus — Montgomery Navigator

Real-time community intelligence platform for Montgomery, Alabama. Aggregates news, jobs, housing, and government services into an interactive map with sentiment analysis and geocoded markers.

## Architecture

```
Frontend (React/Vite)          Backend (FastAPI/uvicorn)
  localhost:8080                 localhost:8787
       │                              │
       ├── Static JSON ◄──────── Scraper writes to public/data/
       └── SSE stream  ◄──────── broadcast_event() pushes live
```

## Data Pipeline

### Scraping Frequency

The backend runs a **scheduled batch scraper** via `backend/scrape_scheduler.py`:

| Setting | Default | Override |
|---------|---------|----------|
| Interval | 15 minutes | `SCRAPE_INTERVAL` env var (seconds) |
| Auto-start | On server boot | Set `AUTO_SCRAPE=0` to disable |
| Streams | jobs, news, housing, benefits | All run concurrently in thread pool |

**This is batch polling, not a live stream.** Each cycle:
1. Triggers all 4 scrape streams in parallel (each in its own thread)
2. Processes and saves results to `frontend/public/data/`
3. Pushes new data to connected frontends via SSE (`/stream` endpoint)

Frontends receive updates in real-time once a batch completes. Between batches, the static JSON files serve as the data source.

### News Pipeline

```
SERP Discovery → Full-Text Fetch → Enrichment → Geocoding → Dedup → Save → SSE Push
```

**Step 1: SERP Discovery** (`backend/triggers/trigger_news.py`)
- Runs 22 Google News queries via Bright Data SERP API (WebUnlocker SDK)
- Queries cover: general news, development, government, events, community
- Returns article URLs, titles, snippets, sources, and timestamps

**Step 2: Full-Text Fetch** (optional, `--skip-fulltext` to disable)
- Fetches top articles via Bright Data `crawl_single_url` SDK
- Extracts markdown content, truncated to 2000 chars
- Rate-limited to 10 articles per cycle for speed

**Step 3: Enrichment** (`backend/processors/process_news.py`)
- Assigns sentiment scores based on keyword analysis
- Normalizes dates and source names
- Generates stable article IDs

**Step 4: Geocoding** (`backend/processors/geocode_news.py`)
- 3-tier geocoding strategy for 100% map coverage:

| Tier | Trigger | Method | Precision |
|------|---------|--------|-----------|
| 1 | Specific location (neighborhood, street, landmark) | Google Maps SERP API | High — real coordinates |
| 2 | City-level mention ("Montgomery", "Alabama State") | Jittered city center | Medium — spread across downtown |
| 3 | No specific mention (all scraped articles are Montgomery-relevant) | Jittered city center | Medium — spread across downtown |

- **Tier 1** matches 28 neighborhoods, 20+ landmarks, and street/highway patterns via regex
- **Jittered coordinates** use a deterministic hash of the article ID to spread pins across downtown, preventing marker stacking
- **Bounding box validation** ensures SERP-resolved coordinates fall within Montgomery metro (32.20-32.55 lat, -86.55 to -86.10 lng)
- Max 500 SERP API calls per cycle (configurable via `max_geocode` parameter)

**Step 5: Deduplication**
- Merges new articles with existing ones
- Deduplicates by article ID (hash of title + source)

### Geocoding Coverage

| Metric | Before Optimization | After Optimization |
|--------|--------------------|--------------------|
| Total articles | 247 | 247 |
| With location | 16 (6.5%) | 247 (100%) |
| Precise (SERP Maps) | 16 | 41 |
| City-center (jittered) | 0 | 206 |
| No mock data | N/A | Confirmed |

### Other Data Streams

| Stream | Source | Dataset |
|--------|--------|---------|
| Jobs | Indeed, LinkedIn, Glassdoor | Web Scraper API (BrightdataEngine) |
| Housing | Zillow | Web Scraper API |
| Benefits | AL Medicaid, SNAP, TANF | Web Unlocker page crawl |
| Services | Montgomery ArcGIS | Direct REST API (no Bright Data) |

## Running

### Prerequisites

- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- Node.js 18+ with npm
- Bright Data API key in `.env`:

```
BRIGHTDATA_API_KEY=your_key_here
BRIGHTDATA_SERP_ZONE=serp_api1
BRIGHTDATA_UNLOCKER_ZONE=web_unlocker1
```

### Start Servers

```bash
# Backend (starts scraper scheduler automatically)
uv run uvicorn backend.webhook_server:app --port 8787

# Frontend
cd frontend && npm run dev
```

### Manual Scraping

```bash
# Full news pipeline
uv run python -m backend.triggers.trigger_news --poll

# Skip full-text fetch (faster)
uv run python -m backend.triggers.trigger_news --poll --skip-fulltext

# Skip geocoding step
uv run python -m backend.triggers.trigger_news --poll --skip-geocode
```

### Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `SCRAPE_INTERVAL` | `900` | Seconds between scrape cycles |
| `AUTO_SCRAPE` | `1` | Set to `0` to disable auto-scraping on boot |
| `BRIGHTDATA_API_KEY` | (required) | Bright Data bearer token |
| `BRIGHTDATA_SERP_ZONE` | `serp_api1` | SERP API zone name |
| `BRIGHTDATA_UNLOCKER_ZONE` | `web_unlocker1` | Web Unlocker zone name |

## Bright Data SDK Usage

All Bright Data interactions use the official `brightdata` Python SDK (v0.4+):

| Feature | SDK Class | Usage |
|---------|-----------|-------|
| Dataset scraping (jobs, housing) | `BrightdataEngine` | `trigger()` → `poll_until_ready()` |
| SERP API (news, geocoding) | `WebUnlocker` | Configured with SERP zone |
| Page fetching (full article text) | `crawl_single_url` | Returns markdown content |

The SERP API uses `WebUnlocker` pointed at the SERP zone (same `/request` endpoint, different zone routing). A JSON format fallback handles cases where the raw response returns HTML instead of JSON.

## Features

### News Sentiment Map

**Latest Addition**: Real-time news feed with interactive map visualization and community sentiment tracking.

- **Map Overlay**: View articles as sentiment-colored pins or heat markers across Montgomery
- **Sidebar Panel**: Browse articles with Latest/Trending sort, category filter, and comment threads
- **Admin Dashboard** (`/admin`): Charts, hotspots, comment feed, and data export for elected officials
- **Community Reactions**: 5 reaction types (👍👎❤️😢😡) with persistent counts
- **Comments**: Inline discussion threads tied to articles, stored in browser localStorage
- **Sentiment Analysis**: Automatic keyword-based sentiment classification (positive/neutral/negative)
- **Geocoding**: 3-tier strategy ensures 100% map coverage—high-precision SERP Maps for named locations, jittered city-center for generic mentions

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Leaflet/react-leaflet, Recharts
- **Backend**: FastAPI, uvicorn, Bright Data SDK, SSE broadcasting
- **Data**: Static JSON files in `public/data/`, no database required
- **Maps**: OpenStreetMap tiles, Leaflet markers with sentiment coloring
- **Persistence**: Browser localStorage for reactions and comments
