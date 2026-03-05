# Bright Data — Integration Guide

> **Last updated:** 2026-03-05
>
> **Docs:** https://docs.brightdata.com
>
> **Dashboard:** https://brightdata.com/cp
>
> **Relevance to MontgomeryAI:** Bright Data fills the gaps that the city's ArcGIS portal cannot — live job listings, benefit eligibility rules, housing data, transit routes, community events. ArcGIS tells you what exists. Bright Data tells you what's happening right now.

---

## Table of Contents

1. [Product Decision Matrix](#1-product-decision-matrix)
2. [Authentication](#2-authentication)
3. [Web Scraper API (Pre-built Scrapers)](#3-web-scraper-api)
4. [Web Unlocker API](#4-web-unlocker-api)
5. [SERP API](#5-serp-api)
6. [Scraping Browser](#6-scraping-browser)
7. [Crawl API](#7-crawl-api)
8. [MCP Server](#8-mcp-server)
9. [Pre-built Scraper IDs & Output Fields](#9-pre-built-scraper-ids--output-fields)
10. [Proxy Infrastructure](#10-proxy-infrastructure)
11. [Datasets Marketplace](#11-datasets-marketplace)
12. [Pricing Summary](#12-pricing-summary)
13. [Error Handling & Best Practices](#13-error-handling--best-practices)
14. [MontgomeryAI Integration Architecture](#14-montgomeryai-integration-architecture)

---

## 1. Product Decision Matrix

Bright Data has four product pillars. Choose based on what you need:

| Question | Product | Why |
|----------|---------|-----|
| "I need structured data from LinkedIn/Indeed/Glassdoor" | **Web Scraper API** | Pre-built scrapers return clean JSON. No parsing needed. |
| "I need HTML/markdown from a protected site" | **Web Unlocker API** | Handles anti-bot, CAPTCHA, proxy rotation. Pay only for success. |
| "I need Google/Bing search results" | **SERP API** | Structured JSON search results with geo-targeting. |
| "I need to interact with a page (login, fill forms, click)" | **Scraping Browser** | Full cloud browser via Playwright/Puppeteer/Selenium. |
| "I need to crawl an entire domain for LLM context" | **Crawl API** | Domain-wide crawl → Markdown/HTML output. |
| "I want an LLM to access the web autonomously" | **MCP Server** | Tools callable directly from Claude/GPT. Free tier: 5K req/month. |
| "I need bulk historical data immediately" | **Datasets Marketplace** | 215+ pre-collected datasets, 17B+ records. |
| "I manage my own scraper and just need IPs" | **Proxies** | Residential (150M+ IPs), Datacenter, ISP, or Mobile. |

### For MontgomeryAI specifically:

| Data Need | Best Product | Rationale |
|-----------|-------------|-----------|
| LinkedIn job listings | Web Scraper API (`gd_lpfll7v5hcqtkxl6l`) | Pre-built, returns structured JSON |
| Indeed job listings | Web Scraper API (`gd_l4dx9j9sscpvs7no2`) | Pre-built, returns structured JSON |
| Glassdoor salary data | Web Scraper API (`gd_lpfbbndm1xnopbrcr0`) | Pre-built, returns structured JSON |
| Alabama Medicaid eligibility | Web Unlocker API | Government site, need HTML → parse rules |
| Alabama DHR (SNAP/TANF) | Web Unlocker API | Government site, need HTML → parse rules |
| City event calendar | Crawl API or Web Unlocker | Crawl the city website for events |
| USDA SNAP retailers | Direct API (free, no Bright Data needed) | USDA has a free public API |
| Transit routes (MAT) | Web Unlocker API | Scrape bus schedules |
| Housing/rental listings | Web Scraper API (Zillow: `gd_lfqkr8wm13ixtbd8f5`) | Pre-built Zillow scraper |

---

## 2. Authentication

### Pattern A: Bearer Token (API products)

Used with: Web Scraper API, SERP API, Unlocker API (direct mode), Crawl API.

```
Authorization: Bearer YOUR_API_KEY
```

**Get your key:**
1. Log in → `https://brightdata.com/cp/setting/users`
2. Account Settings → API Keys → "Add API key"
3. Key shown **once** — save immediately
4. Permission levels: Admin / Finance / Ops / Limit / User

**Rules:**
- One key per user maximum
- Regenerating invalidates the old key immediately
- Admin keys cannot be displayed as plain text after creation

### Pattern B: Proxy Credentials (proxy-based products)

Used with: Residential/Datacenter/ISP/Mobile Proxies, Scraping Browser, SERP API (native mode).

```
Username: brd-customer-[ACCOUNT_ID]-zone-[ZONE_NAME]
Password: [ZONE_PASSWORD]
Host:     brd.superproxy.io
Port:     33335 (proxies) | 9222 (Scraping Browser CDP) | 9515 (Scraping Browser Selenium)
```

**Where to find credentials:**
- **Account ID:** Starts with `hl_###` → Account Settings
- **Zone Name:** Set during zone creation (immutable) → "My Zones"
- **Zone Password:** Unique per zone → Zone Configuration → Security Settings

**Geo-targeting modifiers** (append to username):
```
brd-customer-hl_12345-zone-my_zone-country-us
brd-customer-hl_12345-zone-my_zone-country-us-city-montgomery
brd-customer-hl_12345-zone-my_zone-country-us-state-alabama
```

### Zone Concept

Every Bright Data product is provisioned as a "Zone." Each zone has a unique name, password, and product-specific configuration. Create zones in the Control Panel.

---

## 3. Web Scraper API

The primary product for structured data extraction from specific websites. Operates **asynchronously** (trigger → poll → download) or synchronously (single-shot, 1-minute timeout).

### Core Flow

```
1. POST /datasets/v3/trigger     → returns snapshot_id
2. GET  /datasets/v3/progress/{id} → poll until status = "ready"
3. GET  /datasets/v3/snapshot/{id} → download results
   OR: configure webhook → Bright Data POSTs data to your URL
```

### 3.1 Trigger (Async)

```
POST https://api.brightdata.com/datasets/v3/trigger
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `dataset_id` | Yes | Which scraper to run (e.g., `gd_l1viktl72bvl7bjuj0`) |
| `format` | No | `json` (default), `ndjson`, `jsonl`, `csv` |
| `type` | No | `"discover_new"` for discovery mode |
| `discover_by` | No | `keyword`, `best_sellers_url`, `category_url`, `location` |
| `limit_per_input` | No | Max results per input (minimum: 1) |
| `limit_multiple_results` | No | Total result cap across all inputs |
| `notify` | No | URL to receive notification when done |
| `endpoint` | No | Webhook URL to receive the actual data |
| `include_errors` | No | Include per-record error details |
| `custom_output_fields` | No | Pipe-separated field filter (e.g., `url\|title`) |

**Request body:**

```json
[
  {"url": "https://www.linkedin.com/jobs/view/12345"},
  {"url": "https://www.indeed.com/viewjob?jk=abc123"}
]
```

**Response:**

```json
{"snapshot_id": "s_m4x7enmven8djfqak"}
```

**Python example:**

```python
import requests

def trigger_scraper(api_key: str, dataset_id: str, urls: list[str]) -> str:
    response = requests.post(
        "https://api.brightdata.com/datasets/v3/trigger",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json=[{"url": url} for url in urls],
        params={"dataset_id": dataset_id, "format": "json"}
    )
    response.raise_for_status()
    return response.json()["snapshot_id"]
```

**JavaScript example:**

```javascript
async function triggerScraper(apiKey, datasetId, urls) {
  const params = new URLSearchParams({ dataset_id: datasetId, format: "json" });
  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/trigger?${params}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(urls.map(url => ({ url })))
    }
  );
  const { snapshot_id } = await response.json();
  return snapshot_id;
}
```

### 3.2 Scrape (Sync — 1-Minute Timeout)

For small, fast requests where you want an immediate response.

```
POST https://api.brightdata.com/datasets/v3/scrape
```

Same parameters as trigger. Returns:
- **200:** Data returned directly
- **202:** Timed out (>1 min). Returns `{"snapshot_id": "..."}` with `retry-after` header. Fall back to polling.

### 3.3 Poll Progress

```
GET https://api.brightdata.com/datasets/v3/progress/{snapshot_id}
Authorization: Bearer YOUR_API_KEY
```

**Status values:** `starting` → `running` → `ready` | `failed`

```python
import time

def wait_for_snapshot(snapshot_id: str, api_key: str, poll_interval: int = 15) -> None:
    headers = {"Authorization": f"Bearer {api_key}"}
    url = f"https://api.brightdata.com/datasets/v3/progress/{snapshot_id}"

    while True:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        status = response.json()["status"]

        if status == "ready":
            return
        if status == "failed":
            raise RuntimeError(f"Snapshot {snapshot_id} failed")

        time.sleep(poll_interval)
```

### 3.4 Download Results

```
GET https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}?format=json
Authorization: Bearer YOUR_API_KEY
```

Returns the collected data in the requested format.

### 3.5 List Snapshots

```
GET https://api.brightdata.com/datasets/v3/snapshots?dataset_id={id}&status=ready
```

Supports pagination (`skip`, `limit`), date filtering (`from_date`, `to_date`). Snapshots retained for **30 days**.

### 3.6 Discovery Mode

For scrapers that support it — find records by keyword instead of explicit URLs:

```json
[{"keyword": "nursing jobs montgomery alabama"}]
```

Add `type=discover_new&discover_by=keyword&limit_per_input=100` to query params.

### 3.7 Delivery Options

Instead of polling + download, deliver results directly:

| Type | Target |
|------|--------|
| `webhook` | HTTP POST to your endpoint |
| `s3` | Amazon S3 bucket |
| `azure` | Azure Blob Storage |
| `gcs` | Google Cloud Storage |
| `snowflake` | Snowflake data warehouse |
| `sftp` | SFTP server |
| `email` | Email delivery |

**Webhook delivery config:**

```json
{
  "deliver": {
    "type": "webhook",
    "endpoint": "https://your-server.com/callback"
  },
  "input": [{"url": "https://example.com"}]
}
```

---

## 4. Web Unlocker API

Accepts a URL, returns clean HTML or JSON. Handles proxy rotation, browser fingerprinting, CAPTCHA solving, and retries internally. **Pay only for successful responses.**

### When to use

- Government sites (Alabama Medicaid, DHR, city portals)
- Any site with anti-bot protection where you just need the page content
- **Not for:** browser automation (use Scraping Browser), search engines (use SERP API), login flows

### 4.1 Direct API Mode

```
POST https://api.brightdata.com/request
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `zone` | Yes | Your Web Unlocker zone name |
| `url` | Yes | Target URL to fetch |
| `format` | Yes | `raw` (HTML) or `json` (structured) |
| `country` | No | ISO country code for geo-targeting (e.g., `us`) |
| `data_format` | No | Transform: `markdown` (for LLMs) or `screenshot` (PNG) |

**Python example:**

```python
import requests

def fetch_with_unlocker(url: str, api_key: str, zone: str) -> str:
    response = requests.post(
        "https://api.brightdata.com/request",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        json={
            "zone": zone,
            "url": url,
            "format": "raw",
            "country": "us"
        },
        timeout=60
    )
    response.raise_for_status()
    return response.text
```

**JavaScript example:**

```javascript
async function fetchWithUnlocker(url, apiKey, zone) {
  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({ zone, url, format: "raw", country: "us" })
  });
  return await response.text();
}
```

### 4.2 Markdown Output (for LLMs)

Set `"data_format": "markdown"` to get clean markdown instead of raw HTML. Drastically reduces token count when passing to an LLM.

### 4.3 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad request | Check parameters |
| 401 | Auth required | Check API key |
| 403 | Access forbidden | Target blocks this access pattern |
| 429 | Rate limited | Exponential backoff |
| 502 | Unblocking error | Check `x-luminati-error-code` header |
| 503 | Browser challenge failed | Retry or try premium domains |

### 4.4 Advanced Features

- **Wait for element:** `x-unblock-expect: {"element": ".css-selector"}` (proxy mode header)
- **Premium domains:** Enable for hardest-to-unblock sites during zone creation
- **Debug mode:** Append `-debug-full` to proxy username for `x-brd-debug` response header
- **Auto-throttle:** Kicks in when success rate drops below 70%
- **Success rate check:** `GET https://api.brightdata.com/unblocker/success_rate/{domain}`

---

## 5. SERP API

Returns structured search engine results from Google, Bing, DuckDuckGo, Yandex, Baidu, Yahoo, Naver.

### 5.1 Direct API Mode

```
POST https://api.brightdata.com/request
Authorization: Bearer YOUR_API_KEY
```

```json
{
  "zone": "serp_api1",
  "url": "https://www.google.com/search?q=nursing+jobs+montgomery+al&hl=en&gl=us&brd_json=1",
  "format": "json"
}
```

### 5.2 Key Google Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `q` | Search query (**must come first** in URL) | `q=nursing+jobs` |
| `gl` | Country code | `gl=us` |
| `hl` | Language | `hl=en` |
| `tbm` | Type: `isch` (images), `nws` (news), `vid` (videos) | `tbm=nws` |
| `ibp` | Job search | `ibp=htl%3Bjobs` |
| `brd_json` | Parse to JSON: `1` (JSON), `html` (JSON + raw HTML) | `brd_json=1` |
| `brd_mobile` | Device: `0` (desktop), `1` (mobile) | `brd_mobile=1` |
| `start` | Pagination offset (multiples of 10) | `start=20` |

> **IMPORTANT:** `q` must come first in the URL for optimal performance.

### 5.3 Parsed JSON Response

```json
{
  "engine": "google",
  "query": "nursing jobs montgomery al",
  "results": [
    {
      "type": "organic",
      "position": 1,
      "title": "Page Title",
      "url": "https://example.com",
      "description": "..."
    }
  ]
}
```

### 5.4 Async Mode

For bulk SERP collection. Returns `snapshot_id` for later retrieval. Achieves **99.99% success rate**. Responses stored 48 hours.

---

## 6. Scraping Browser

A managed cloud browser. Connect via Playwright, Puppeteer, or Selenium. Handles IP rotation, fingerprinting, CAPTCHA solving.

### When to use

- JavaScript-heavy sites requiring a real browser
- Multi-step flows: login, form fills, navigation
- Sites that require human-like browser interaction

### 6.1 Connection Endpoints

| Framework | Protocol | Endpoint |
|-----------|----------|----------|
| Playwright / Puppeteer | WebSocket/CDP | `wss://USERNAME:PASSWORD@brd.superproxy.io:9222` |
| Selenium | HTTPS | `https://USERNAME:PASSWORD@brd.superproxy.io:9515` |

### 6.2 Playwright (Python)

```python
from playwright.async_api import async_playwright

AUTH = "brd-customer-hl_12345-zone-scraping_browser1:YOUR_PASSWORD"

async def scrape_with_browser(url: str) -> str:
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp(
            f"wss://{AUTH}@brd.superproxy.io:9222"
        )
        page = await browser.new_page()

        # Block bandwidth-heavy resources
        await page.route("**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2}",
                         lambda route: route.abort())

        await page.goto(url, timeout=120_000)

        # Handle CAPTCHA if present
        client = await page.context.new_cdp_session(page)
        await client.send("Captcha.waitForSolve", {"detectTimeout": 30_000})

        html = await page.content()
        await browser.close()
        return html
```

### 6.3 Playwright (Node.js)

```javascript
const { chromium } = require("playwright");

const AUTH = "brd-customer-hl_12345-zone-scraping_browser1:YOUR_PASSWORD";

async function scrapeWithBrowser(url) {
  const browser = await chromium.connectOverCDP(
    `wss://${AUTH}@brd.superproxy.io:9222`
  );
  const page = await browser.newPage();
  await page.goto(url, { timeout: 2 * 60 * 1000 });

  const client = await page.context().newCDPSession(page);
  const { status } = await client.send("Captcha.waitForSolve", {
    detectTimeout: 10_000
  });

  const html = await page.content();
  await browser.close();
  return html;
}
```

### 6.4 Bandwidth Optimization

Block unnecessary resources to reduce cost:

```javascript
const BLOCKED_TYPES = ["image", "stylesheet", "font", "media", "svg"];
const BLOCKED_DOMAINS = ["googletagmanager.com", "doubleclick.net"];

page.on("request", (request) => {
  const block = BLOCKED_TYPES.includes(request.resourceType()) ||
    BLOCKED_DOMAINS.some(d => request.url().includes(d));
  block ? request.abort() : request.continue();
});
```

---

## 7. Crawl API

Domain-wide crawling that outputs structured, LLM-compatible Markdown or HTML.

```
POST https://api.brightdata.com/datasets/v3/trigger
dataset_id=gd_m6gjtfmeh43we6cqc
```

Uses the same trigger/progress/snapshot flow as the Web Scraper API.

```python
payload = [
    {"url": "https://www.montgomeryal.gov"},
    {"url": "https://medicaid.alabama.gov"}
]
params = {"dataset_id": "gd_m6gjtfmeh43we6cqc", "include_errors": True}
```

**Pricing:** Starting at $1/1K requests.

---

## 8. MCP Server

Exposes Bright Data tools directly inside AI assistants (Claude, GPT, Cursor) via Model Context Protocol.

### 8.1 Free Tier

**5,000 requests/month** at no cost. No credit card required.

### 8.2 Setup (Local via npx)

Add to Claude Desktop or Cursor config:

```json
{
  "mcpServers": {
    "Bright Data": {
      "command": "npx",
      "args": ["@brightdata/mcp"],
      "env": {
        "API_TOKEN": "YOUR_API_KEY"
      }
    }
  }
}
```

### 8.3 Hosted (No Setup)

```
https://mcp.brightdata.com/mcp?token=YOUR_API_TOKEN
```

### 8.4 Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `API_TOKEN` | Auth (required) | — |
| `PRO_MODE` | Enable all 60+ tools | `false` |
| `RATE_LIMIT` | Rate limiting | Unlimited |
| `WEB_UNLOCKER_ZONE` | Custom unlocker zone | `mcp_unlocker` |
| `BROWSER_ZONE` | Custom browser zone | `mcp_browser` |
| `POLLING_TIMEOUT` | Timeout (seconds) | `600` |
| `GROUPS` | Tool groups to enable | — |
| `TOOLS` | Individual tools | — |

### 8.5 Rapid Mode Tools (Default / Free)

| Tool | Description |
|------|-------------|
| `search_engine` | Web search (Google/Bing/Yandex) |
| `scrape_as_markdown` | Fetch URL → clean Markdown |
| `search_engine_batch` | Multiple searches in one call |
| `scrape_batch` | Multiple URLs in one call |

### 8.6 Pro Mode Tools (60+)

Enable with `PRO_MODE=true`. Adds browser automation + structured web data tools:

**Browser automation:** `scraping_browser_navigate`, `scraping_browser_click`, `scraping_browser_type`, `scraping_browser_get_html`, `scraping_browser_screenshot`, `scraping_browser_wait_for`

**Structured data (relevant to MontgomeryAI):**
- `web_data_linkedin_person_profile`, `web_data_linkedin_company_profile`, `web_data_linkedin_posts`
- `web_data_zillow_properties_listing`
- `web_data_facebook_posts`, `web_data_facebook_marketplace_listings`
- `web_data_youtube_videos`
- `web_data_crunchbase_company`

### 8.7 Tool Groups

| Group | Included |
|-------|----------|
| `ecommerce` | Amazon, Walmart, Google Shopping |
| `social` | LinkedIn, TikTok, YouTube |
| `browser` | Scraping Browser automation |
| `finance` | Yahoo Finance |
| `business` | Crunchbase, ZoomInfo, Zillow |
| `research` | GitHub, Reuters News |
| `travel` | Booking hotels |

---

## 9. Pre-built Scraper IDs & Output Fields

All pre-built scrapers use the same trigger/progress/download API (Section 3). Only the `dataset_id` differs.

### 9.1 LinkedIn

| Scraper | Dataset ID | Input |
|---------|-----------|-------|
| People Profiles | `gd_l1viktl72bvl7bjuj0` | `{"url": "https://www.linkedin.com/in/username/"}` |
| Companies | `gd_l1vikfnt1wgvvqz95w` | `{"url": "https://www.linkedin.com/company/name"}` |
| Jobs | `gd_lpfll7v5hcqtkxl6l` | `{"url": "https://www.linkedin.com/jobs/view/12345"}` |

**Jobs output fields:** `job_posting_id`, `job_title`, `company_name`, `company_id`, `job_location`, `job_description`, `job_seniority_level`, `job_summary`, `url`, `timestamp`

**People output fields:** `profile_id`, `name`, `city`, `country_code`, `current_position`, `about`, `education[]`, `experience[]`, `courses`, `followers`, `connections`, `projects[]`

### 9.2 Indeed

| Scraper | Dataset ID | Input |
|---------|-----------|-------|
| Jobs | `gd_l4dx9j9sscpvs7no2` | `{"url": "https://www.indeed.com/viewjob?jk=..."}` |
| Companies | `gd_l7qekxkv2i7ve6hx1s` | `{"url": "https://www.indeed.com/cmp/name"}` |

**Jobs output fields:** `jobid`, `company_name`, `date_posted_parsed`, `job_title`, `description_text`, `benefits`, `qualifications`, `job_type`, `timestamp`

### 9.3 Glassdoor

| Scraper | Dataset ID | Input |
|---------|-----------|-------|
| Jobs | `gd_lpfbbndm1xnopbrcr0` | `{"url": "https://www.glassdoor.com/job-listing/..."}` |
| Company Reviews | `gd_l7j1po0921hbu0ri1z` | `{"url": "https://www.glassdoor.com/Reviews/..."}` |
| Company Overview | `gd_l7j0bx501ockwldaqf` | `{"url": "https://www.glassdoor.com/Overview/..."}` |

**Jobs output fields:** `company_name`, `company_rating`, `job_title`, `job_location`, `overview`, `headquarters`, `url`, `timestamp`

**Reviews output fields:** `review_id`, `rating_date`, `pros`, `cons`, `timestamp`. Optional param: `"days": 10` (last N days).

### 9.4 Zillow

| Scraper | Dataset ID | Input |
|---------|-----------|-------|
| Property Listings | `gd_lfqkr8wm13ixtbd8f5` | `{"url": "https://www.zillow.com/homedetails/..."}` |

### 9.5 Full Catalog

437 scrapers across ecommerce, social media, jobs, real estate, travel, business, and reviews. Browse at: `https://brightdata.com/cp/scrapers/browse?category=all`

---

## 10. Proxy Infrastructure

All proxies use the same connection format:

```
http://brd-customer-[ACCOUNT_ID]-zone-[ZONE_NAME]:[PASSWORD]@brd.superproxy.io:33335
```

### Comparison

| Type | Pool Size | Speed | Best For | Price |
|------|-----------|-------|----------|-------|
| **Residential** | 150M+ IPs, 195 countries | ~0.7s | Protected sites, geo-targeting | $8/GB ($4 with promo) |
| **Datacenter** | 770K+ IPs, 98 countries | ~0.24s (fastest) | High volume, less protected sites | $0.60/GB |
| **ISP** | 1.3M+ static IPs, 190 countries | Fast | Best middle ground: residential look + datacenter speed | $8/GB |
| **Mobile** | 7M+ IPs, 3G/4G/5G | Varies | Mobile-specific content, carrier targeting | $8/GB |

### Geo-targeting (Residential)

Append to username:

```
-country-us                     # Country
-country-us-city-montgomery     # City
-country-us-state-alabama       # State
-country-us-zip-36101           # ZIP
```

### Sticky Sessions

For same IP across requests, append `-session-[ID]` to username.

---

## 11. Datasets Marketplace

215+ pre-collected datasets, 17B+ records. Data already scraped, validated, and structured.

**Categories:** LinkedIn, Indeed, Glassdoor, Amazon, Zillow, Instagram, TikTok, Twitter/X, Facebook, YouTube, Reddit, Crunchbase, Google Maps, and more.

**Pricing:** Starting from $250 per 100K records ($0.0025/record).

**Browse:** `https://brightdata.com/cp/datasets/browse`

---

## 12. Pricing Summary

| Product | Starting Price | Billing Model |
|---------|---------------|---------------|
| **Web Scraper API** | $1.50/1K records | Per successful record |
| **Web Unlocker** | $1.50/1K requests | Per successful request only |
| **SERP API** | $1.50/1K results | Per successful result |
| **Scraping Browser** | $8/GB | Bandwidth |
| **Crawl API** | $1/1K requests | Per request |
| **Residential Proxies** | $8/GB ($4 with `RESIGB50`) | Bandwidth |
| **Datacenter Proxies** | $0.60/GB or $0.90/IP | Bandwidth or per-IP |
| **ISP Proxies** | $8/GB or $1.30/IP | Bandwidth or per-IP |
| **Mobile Proxies** | $8/GB | Bandwidth |
| **Datasets** | $250/100K records | Per record |
| **MCP Server (Rapid)** | **Free** | 5,000 req/month |
| **MCP Server (Pro)** | Pay-as-you-go | 60+ tools |

**Promotions:**
- Sign-up bonus: **$5 free credits**, no credit card required
- Matching deposit: up to **$500** on first deposit
- Web Scraper: `APIS25` (25% off for 6 months)
- Residential: `RESIGB50` (50% off)

**For hackathon:** $5 free credits + matching deposit covers estimated $2–5 total usage.

---

## 13. Error Handling & Best Practices

### Web Scraper API

- Use **async mode** for batches. Sync has a hard 1-minute timeout.
- Poll at **10–30 second intervals**. Aggressive polling may trigger rate limits.
- Use **webhooks** in production to eliminate polling.
- Handle **202 responses** from sync endpoint — switch to polling.
- Use `custom_output_fields` to reduce payload size.
- Set `limit_per_input` in discovery mode to avoid unbounded costs.
- Snapshots available for **30 days**.

### Web Unlocker

- Use **direct API mode** over proxy mode — simpler, no SSL cert management.
- Set `data_format: "markdown"` for LLM consumption.
- Handle **429s** with exponential backoff. Auto-throttle at 70% success rate.
- Enable **premium domains** for hard sites during zone creation.
- Use `x-unblock-expect` for deferred content loading.

### SERP API

- **`q` parameter must come first** in URL for optimal performance.
- Use `brd_json=1` for structured JSON output.
- Use **async mode** for bulk — achieves 99.99% success rate.

### Scraping Browser

- Set **2-minute timeouts** on `page.goto()`.
- **Block images/CSS/fonts** to reduce bandwidth costs significantly.
- Use `Captcha.waitForSolve` before extracting data.
- Do not add custom WebSocket options — they break the connection.

### General Error Handling Pattern

```python
import requests
import time

def trigger_with_retry(
    dataset_id: str,
    inputs: list[dict],
    api_key: str,
    max_retries: int = 3
) -> str:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    params = {"dataset_id": dataset_id, "format": "json"}

    for attempt in range(max_retries):
        response = requests.post(
            "https://api.brightdata.com/datasets/v3/trigger",
            headers=headers,
            json=inputs,
            params=params,
            timeout=30
        )

        if response.status_code == 200:
            return response.json()["snapshot_id"]

        if response.status_code == 429:
            wait = 2 ** attempt * 5
            time.sleep(wait)
            continue

        if response.status_code in (400, 401):
            raise ValueError(f"Not retryable: {response.status_code} {response.text}")

        response.raise_for_status()

    raise RuntimeError(f"Failed after {max_retries} retries")
```

---

## 14. MontgomeryAI Integration Architecture

### Two-Layer Design

```
┌─────────────────────────────────────────────────────────┐
│               LAYER 1: DASHBOARD (Cached)                │
│                                                          │
│  Source:  ArcGIS REST API → ETL → DuckDB                 │
│  Refresh: Nightly/weekly depending on dataset velocity    │
│  Serves:  Leaflet map, civic action cards, analytics      │
│  Answer:  "What exists in Montgomery?"                    │
│           Facilities, boundaries, permits, violations     │
└────────────────────────┬─────────────────────────────────┘
                         │ User clicks "Help me prepare"
                         ▼
┌─────────────────────────────────────────────────────────┐
│             LAYER 2: AGENT TOOLS (Live)                   │
│                                                          │
│  Source:  Bright Data API → Agent tool call → Response     │
│  Refresh: Real-time per conversation turn                  │
│  Serves:  CivicGuide + CareerPath agents                   │
│  Answer:  "What can I do RIGHT NOW?"                       │
│           Jobs, benefits, events, housing, transit          │
└─────────────────────────────────────────────────────────┘
```

### Why Live, Not Cached

1. **Freshness** — Jobs, events, eligibility rules are time-sensitive. A 3-day-old scrape is stale.
2. **Context-driven** — The agent knows the user's profile and sends targeted queries.
3. **Cost** — Pay per request (~$0.01–0.05) vs scraping everything daily.
4. **Demo impact** — Live tool calls during conversation are a stronger demo.

### CivicGuide Agent Tools (Dorothy's persona)

| Tool | Bright Data Product | Trigger | Returns |
|------|-------------------|---------|---------|
| `search_medicaid_eligibility` | Web Unlocker | "Do I qualify for Medicaid?" | Income thresholds, steps, required docs |
| `search_snap_eligibility` | Web Unlocker | "How do I get food stamps?" | SNAP limits, household rules, links |
| `search_tanf_rules` | Web Unlocker | "Cash assistance?" | TANF criteria, time limits, work reqs |
| `find_snap_retailers` | USDA API (free) | "Where can I use my EBT?" | Stores near zip accepting SNAP |
| `search_community_events` | Crawl API | "What's happening near me?" | Events, job fairs, workshops |
| `search_transit_routes` | Web Unlocker | "How do I get there?" | Bus routes, schedules, times |
| `lookup_council_rep` | ArcGIS (cached) | "Who represents me?" | Council member, district, meeting date |

### CareerPath Agent Tools (Marcus's persona)

| Tool | Bright Data Product | Trigger | Returns |
|------|-------------------|---------|---------|
| `search_jobs` | Web Scraper API (Indeed + LinkedIn) | "What jobs are available?" | Titles, employers, salary, apply links |
| `search_government_jobs` | Web Unlocker (USAJobs) | "Government positions?" | Federal/state postings, deadlines |
| `get_salary_data` | Web Scraper API (Glassdoor) | "What does X pay?" | Salary benchmarks by role in Montgomery |
| `search_training_programs` | Crawl API | "How do I upskill?" | Programs, schedules, costs |
| `search_housing` | Web Scraper API (Zillow) | "Apartments near my job?" | Listings, prices, proximity |

### Hybrid Cases — Cached Base + Live Enrichment

| Dashboard (ArcGIS, Cached) | Agent Enrichment (Bright Data, Live) | Combined Value |
|----------------------------|--------------------------------------|----------------|
| Business Licenses (122K locations) | `search_jobs` at those employers | "Baptist Medical Center has 3 open nursing positions right now" |
| Health Care Facilities (36) | `search_medicaid_eligibility` | "You qualify — nearest clinic is 0.8mi on the map" |
| Education Facilities (90) | `search_training_programs` | "ASU starts a free GED cohort March 15" |
| Community Centers (23) | `search_community_events` | "Cramton Bowl is hosting a job fair next Tuesday" |
| Flood Hazard Areas | `search_housing` | "That apartment is in a FEMA flood zone — consider these alternatives" |
| Council Districts (9) | `lookup_council_rep` | "You're in District 4 — next public comment session is March 11" |

### Lookup Strategy — SQL over DuckDB, Not RAG

ArcGIS data is structured rows (`name`, `address`, `phone`, `type`, `beds`), not paragraphs. SQL exact filtering beats vector similarity:

```python
# Agent translates natural language → SQL
query_montgomery_services(
    category="daycare",
    near_lat=32.3829, near_lng=-86.3636,   # Maxwell AFB
    radius_miles=3,
    filters={"Night_Hour": "IS NOT NULL"}
)

# DuckDB executes:
# SELECT name, address, phone, Night_Hour, Night_Ages
# FROM daycare_centers
# WHERE Night_Hour IS NOT NULL
#   AND haversine(lat, lng, 32.3829, -86.3636) < 3
# ORDER BY distance ASC
```

**Why SQL over RAG for this data:**
1. **Exact** — "Daycares with night hours in District 3" returns exactly that
2. **Fast** — DuckDB queries over 450K rows complete in <50ms
3. **Composable** — Daycares → cross-reference bus routes → check flood zones
4. **Debuggable** — SQL is inspectable; cosine similarity scores are opaque
5. **Zero infrastructure** — DuckDB is in-process. No vector DB server needed.

**Bright Data tools handle everything SQL can't answer** — because the data doesn't exist locally:

| Question Type | Method |
|---------------|--------|
| "What services exist near me?" | SQL → DuckDB (cached ArcGIS) |
| "Do I qualify for Medicaid?" | Bright Data → Web Unlocker (live) |
| "Are there jobs at Baptist East?" | Bright Data → Web Scraper API (live) |
| "How do I get there by bus?" | Bright Data → Web Unlocker (live) |

### Data Gap Summary

The city ArcGIS covers **physical infrastructure and government services**. It has zero data on:

| Gap | What's Missing | Bright Data Solution |
|-----|---------------|---------------------|
| **Jobs & Employment** | No job listings anywhere in ArcGIS | Web Scraper API (Indeed/LinkedIn/Glassdoor) |
| **Benefits Eligibility** | No Medicaid/SNAP/TANF rules | Web Unlocker (Alabama Medicaid, DHR portals) |
| **Housing** | No rental listings or prices | Web Scraper API (Zillow) |
| **Transit** | No bus routes or schedules | Web Unlocker (MAT bus system) |
| **Events** | No community events or programs | Crawl API (city website, Eventbrite) |
| **Safety** | No crime incident data | Web Unlocker (CrimeMapping.com) |
