# MontgomeryAI — Comprehensive Codebase Review

> **Reviewer:** Claude (automated deep review)
> **Date:** 2026-03-07
> **Branch:** `news/sentiment`
> **Methodology:** [ApplicationClaimsEvaluator.md](helper_prompts/ApplicationClaimsEvaluator.md)

---

## 1. Claims Validation Table

| Documentation Claim | Verification & Status |
|---|---|
| **Real-time news feed with sentiment analysis** — map overlay, sidebar, community reactions | **✅ Verified.** `process_news.py` → `sentiment_rules.py` scoring, `geocode_news.py` 3-tier geocoding, `NewsMapOverlay.tsx` + `NewsSidebarPanel.tsx` render pins/articles. SSE broadcasts on scrape completion. |
| **Geocoding: 100% map coverage via 3-tier strategy** — SERP Maps for named locations, jittered city-center otherwise | **✅ Verified.** `geocode_news.py` implements all 3 tiers. README metrics confirmed (247/247 articles with location). Bounding-box validation present. |
| **Live SSE push** — frontends receive updates in real-time when a scrape batch completes | **✅ Verified.** `sse_broadcaster.py` → `stream.py` endpoint → `useDataStream.ts` dispatches `MERGE_JOB_LISTINGS` / `MERGE_NEWS_ARTICLES`. Housing SSE received but only `console.log`'d (not rendered). |
| **Scheduled scraping every 15 minutes** — jobs, news, housing, benefits concurrently | **✅ Verified.** `scrape_scheduler.py` runs infinite loop with `SCRAPE_INTERVAL_SECONDS=900`. All 4 streams in `run_all_streams()`. |
| **Bright Data SDK for all scraping** — Web Scraper API, SERP API, Web Unlocker | **✅ Verified.** `bright_data_client.py` wraps `BrightdataEngine` and `WebUnlocker`. All triggers use it. SDK v0.4+ in `pyproject.toml`. |
| **Mayor Chat agent** — LangChain + Gemini with 9 read-only tools, streaming | **✅ Verified.** `mayor_chat.py` uses `create_agent` with `ChatGoogleGenerativeAI`. 9 tools in `registry.py`. Streaming via `astream(stream_mode="updates")`. |
| **Admin Dashboard** — sentiment charts, hotspots, comment feed, AI insights, export | **✅ Verified.** `AdminDashboard.tsx` mounts `SentimentOverview`, `HotSpotsPanel`, `CommentFeed`, `AIInsightsCard`, `ExportControls`. |
| **5 citizen personas with 30+ civic fields** | **✅ Verified.** `mock_citizens.json` contains 5 personas with age, income, housing, children, transport, insurance, goals, barriers, full CV data. |
| **8 ArcGIS service categories** — health, community, childcare, education, safety, libraries, parks, police | **✅ Verified.** `arcgisService.ts` queries 8 category endpoints from Montgomery GIS REST API. |
| **Community reactions (5 types) + comments** — persistent counts | **⚠️ Partially.** Reactions and comments are browser `localStorage` only. Multi-user persistence is impossible — each user sees only their own reactions. "Persistent counts" is misleading without a shared backend store. |
| **Housing SSE integration** — live Zillow listings on map | **⚠️ Partial.** Backend processes and broadcasts housing data. Frontend receives it in `useDataStream.ts` but only logs to console — no dispatch, no rendering. |
| **Benefits stream** — live government benefits data | **⚠️ Partial.** `_run_benefits_scrape()` runs in scheduler, saves `gov_services.json`, but no SSE broadcast, no `/webhook/benefits` endpoint, and no frontend SSE handler for benefits. The static JSON file is used instead. |
| **Python 3.11+ required** (README) | **⚠️ Mismatch.** `.python-version` says `3.13`, `pyproject.toml` says `>=3.13`. README says "3.11+". Minor doc inconsistency. |
| **Port 8001 for Analysis API** | **❌ Bug.** `apiConfig.ts` defaults `ANALYSIS_API_BASE` to `localhost:8001`. The actual FastAPI server runs on `8787`. Mayor chat POST goes to `8001/api/chat` — this will fail unless `VITE_ANALYSIS_API_BASE` is explicitly overridden. |

---

## 2. Architecture Evaluation

### 2.1 Modularity & Layering

The backend follows a clear layered structure:

```
api/          → HTTP interface (routers, middleware, SSE)
core/         → Shared infrastructure (Bright Data client, SSE broadcaster, scheduler, config)
processors/   → Data transformation (parse, enrich, geocode, save)
triggers/     → CLI entry points for manual scrape runs
agents/       → LLM agent (mayor chat, tools, prompts)
```

**Strengths:**
- Clean separation of concerns — routers are thin, processors handle logic, triggers are CLI wrappers
- Each processor is focused on one data stream
- Lazy imports in scheduler prevent circular dependencies

**Weaknesses:**
- `processors/analyze_comments.py` imports from `agents/prompts.py` — processor reaching into agent layer
- `core/build_civic_services_geojson.py` (564 lines) is a data dump masquerading as code — the 25-service catalog should be a JSON data file
- No formal service layer between routers and processors — webhook handlers directly call processor functions

### 2.2 Layer Violation Map

```
CLEAN:
  api/routers/webhooks.py  → processors/process_*.py     ✅
  api/routers/stream.py    → core/sse_broadcaster.py      ✅
  api/routers/chat.py      → agents/mayor_chat.py         ✅
  core/scrape_scheduler.py → triggers + processors        ✅
  triggers/*               → core + processors            ✅

VIOLATIONS:
  processors/analyze_comments.py → agents/prompts.py      ⚠️ (cross-layer)
  processors/geocode_news.py     → core/bright_data_client.py  ⚠️ (processor calling SDK directly)
```

### 2.3 Frontend Architecture

- **State:** Single `useReducer` in `appContext.tsx` (310 lines, 50+ action types) — functional but monolithic
- **Stores:** Zustand for admin chat and comments (well-separated)
- **Components:** Organized by feature (`cv/`, `news/`, `services/`, `admin/`) — clean
- **Data flow:** Static JSON fetch on mount + SSE merge for live updates — pragmatic for hackathon

**Concern:** `appContext.tsx` at 310 lines with 50+ actions is becoming unwieldy. For a hackathon this is fine; for production it would need splitting into feature-specific contexts.

### 2.4 Data Flow Diagram

```
                  ┌─────────────────────────────────────────────┐
                  │           scrape_scheduler.py               │
                  │  (runs every 15 min in background task)     │
                  └──────┬──────┬──────┬──────┬─────────────────┘
                         │      │      │      │
                    jobs  news  housing benefits
                         │      │      │      │
                  ┌──────▼──────▼──────▼──────▼─────────────────┐
                  │         bright_data_client.py                │
                  │  trigger_and_collect / serp_search / unlocker│
                  └──────┬──────┬──────┬──────┬─────────────────┘
                         │      │      │      │
                  ┌──────▼──────▼──────▼──────▼─────────────────┐
                  │          processors/*.py                     │
                  │  parse → enrich → geocode → dedup → save    │
                  └──────┬──────┬──────┬──────┬─────────────────┘
                         │      │      │      │
                    ┌────▼──────▼──────▼──────▼────┐
                    │  frontend/public/data/*.json  │ (static files)
                    └──────────────────────────────┘
                         │
                    ┌────▼────────────────────────┐
                    │  sse_broadcaster.py          │ (push to connected clients)
                    └─────────────────────────────┘
```

---

## 3. Code Complexity Analysis

### 3.1 Files Exceeding 150-Line Convention

| File | Lines | Severity | Recommendation |
|---|---|---|---|
| `core/build_civic_services_geojson.py` | 564 | **Critical** | Extract `SERVICES[]` to `data/civic_services_raw.json`, reduce script to ~60 lines |
| `frontend/src/lib/types.ts` | 348 | Moderate | Split by domain: `types/news.ts`, `types/jobs.ts`, `types/civic.ts` |
| `frontend/src/lib/appContext.tsx` | 310 | Moderate | Split reducer into per-feature reducers, combine in root |
| `backend/processors/geocode_news.py` | 237 | Moderate | Extract `NEIGHBORHOODS`, `LANDMARKS` constants to data file |
| `backend/core/bright_data_client.py` | 214 | Minor | Acceptable — wraps an external SDK, naturally has many methods |
| `backend/processors/process_jobs.py` | 199 | Minor | Could extract ArcGIS geocoding to `geocoding_utils.py` |
| `backend/core/payloads.py` | 176 | Minor | Data constants file — inherently long, acceptable |
| `backend/core/scrape_scheduler.py` | 178 | Minor | Acceptable — 4 runners + scheduler logic |
| `backend/agents/tools/news_tools.py` | 160 | Minor | Right at the edge — acceptable |

### 3.2 Cross-Module Coupling

```
HIGH COUPLING (many dependents):
  backend/config.py          → imported by 13 modules
  backend/core/bright_data_client.py → imported by 5 modules
  backend/core/sse_broadcaster.py    → imported by 3 modules

LOW COUPLING (self-contained):
  backend/core/sentiment_rules.py    → pure logic, no imports
  backend/processors/redact_pii.py   → pure logic, no imports
  backend/processors/schemas.py      → Pydantic only
```

`config.py` being widely imported is expected and healthy. `bright_data_client.py` being imported by both `core/` and `processors/` is a minor smell — processors should ideally receive data rather than fetching it.

### 3.3 Thread Safety Concern

`sse_broadcaster.py` uses a module-level `set()` for client queues. With `asyncio` this is fine (single-threaded event loop), but `scrape_scheduler.py` calls `broadcast_event()` from a `ThreadPoolExecutor` thread. `asyncio.Queue.put_nowait()` is not thread-safe. This could cause race conditions under load.

**Fix:** Use `loop.call_soon_threadsafe(queue.put_nowait, payload)` from the thread, or broadcast from the async context after `run_in_executor` returns.

### 3.4 Error Handling Assessment

| Location | Quality | Notes |
|---|---|---|
| `analysis.py` router | **Good** — catches exceptions, updates status dict | But `_status` is a module-level mutable dict (not request-scoped) |
| `scrape_scheduler.py` | **Good** — each stream wrapped in try/except with logging | Errors don't crash the loop |
| `webhook handlers` | **Poor** — no try/except; a processor crash returns 500 | Should catch and return structured errors |
| `bright_data_client.py` | **Fair** — has some error handling but broad `except Exception` in places | |
| `mayor_chat.py` | **None** — no error handling; LLM/network failures bubble up uncaught | |
| `adminChatStore.ts` | **Good** — catch block shows user-friendly error | |
| `sse_broadcaster.py` | **Good** — `QueueFull` caught and dropped silently | Appropriate for SSE |

### 3.5 Test Coverage

**Backend:** Zero tests. `pytest` is not even a dependency. No `tests/` directory.

**Frontend:** Single placeholder test (`expect(true).toBe(true)`). Vitest configured but unused.

**`brightdata/test_sdk.py`:** Manual integration test with stale imports (`scripts.` paths no longer exist). Would fail if run.

---

## 4. Real-World Readiness

### 4.1 Performance Concerns

| Issue | Impact | Location |
|---|---|---|
| **ThreadPoolExecutor max_workers=2** for 4 scrape streams | 2 streams queue behind the first 2. Each stream involves minutes of HTTP calls. | `scrape_scheduler.py:26` |
| **Rate-limit sleeps** in processors (0.3s, 1s, 2s between API calls) | Necessary for API limits but makes scrape cycles slow (minutes per stream) | `process_jobs.py`, `trigger_news.py` |
| **No caching** — static JSON files re-read from disk on every request | Acceptable for hackathon, not for production | All tool functions in `agents/tools/` |
| **Unbounded queue size** in SSE broadcaster | Slow clients accumulate messages in memory | `sse_broadcaster.py:16` — Queue() with no maxsize |
| **Agent rebuilt per request** — `build_mayor_agent()` called on every chat message | LLM client + tool registration overhead on each request | `mayor_chat.py:58` |

### 4.2 Security Assessment

| Issue | Severity | Location |
|---|---|---|
| CORS allows `localhost:*` origins | Low (dev only) | `api/main.py` |
| No authentication on any endpoint | **High** — admin dashboard and analysis trigger are unprotected | All routers |
| No rate limiting | Medium — webhook endpoints accept unlimited POST payloads | `webhooks.py` |
| PII redaction exists | **Good** — `redact_pii.py` strips phone/email/address before LLM | `analyze_comments.py` |
| API keys in env vars only | **Good** — no hardcoded secrets | `config.py` |
| No input validation on webhook payloads | Medium — raw JSON parsed and processed without schema validation | `webhooks.py` |

### 4.3 Deployment Readiness

- **No Dockerfile** — no containerization
- **No CI/CD** — no GitHub Actions, no automated tests
- **No health check depth** — `/health` returns static OK, doesn't check Bright Data connectivity or disk space
- **No log aggregation** — `logging.basicConfig` to stdout only
- **No graceful shutdown** — scheduler task is cancelled but in-flight HTTP requests may be interrupted

### 4.4 Missing Dependencies

| Package | Needed By | Status |
|---|---|---|
| `pytest` | Testing | **Missing** from `pyproject.toml` |
| `python-dotenv` | `mayor_chat.py`, `api/main.py` | **Missing** from `pyproject.toml` (works via `uv` implicit but fragile) |
| `httpx` or `requests` | Would be needed for proper testing | Missing |
| `pydantic` | `processors/schemas.py` | **Missing** (comes transitively via FastAPI but should be explicit) |
| `pydantic-settings` | Recommended by conventions | Not used |

---

## 5. Port Configuration Bug

This is the most critical runtime bug found:

```
Frontend apiConfig.ts:  ANALYSIS_API_BASE = "http://localhost:8001"
FastAPI server:          runs on port 8787
Vite proxy:             /api/* → localhost:8787
```

The mayor chat (`adminChatStore.ts:50`) sends POST directly to `${ANALYSIS_API_BASE}/api/chat` = `http://localhost:8001/api/chat`. Unless `VITE_ANALYSIS_API_BASE` is set to `http://localhost:8787` in the environment, **the chat will fail with connection refused**.

The SSE stream works because `useDataStream.ts` uses relative `/api/stream` which goes through the Vite proxy.

**Fix:** Either:
1. Change `apiConfig.ts` default to `http://localhost:8787`
2. Or change the chat store to use relative `/api/chat` (preferred — uses Vite proxy)

---

## 6. Stale References

| Reference | Location | Issue |
|---|---|---|
| `scripts.webhook_server:app` | `docs/plans/*.md` (6 refs) | Old path, now `backend.api.main:app` |
| `scripts.bright_data_client` | `brightdata/test_sdk.py` | Import path doesn't exist |
| `scripts.payloads` | `brightdata/test_sdk.py` | Import path doesn't exist |
| `backend/scrape_scheduler.py` | `README.md:19` | Should be `backend/core/scrape_scheduler.py` |

---

## 7. Scoring

| Category | Score | Justification |
|---|:---:|---|
| **Feature Completeness** | **8/10** | All major features implemented. Housing SSE not rendered. Benefits not live-pushed. Port bug blocks chat. |
| **Architecture Robustness** | **7/10** | Clean layering, good separation. Minor cross-layer violations. No service layer between routers and processors. Thread-safety concern in broadcaster. |
| **Code Complexity & Maintainability** | **6/10** | Most files are clean and readable. 8 files exceed 150-line limit (1 critically at 564). Zero test coverage. `appContext.tsx` monolith. |
| **Real-World Readiness** | **4/10** | No auth, no tests, no CI/CD, no containerization, port bug, thread-safety issue, no input validation on webhooks. Hackathon-appropriate, not production-ready. |
| **Documentation Quality** | **8/10** | Excellent README with diagrams, metrics, and configuration. CLAUDE.md is thorough. Architecture docs exist. Minor stale references. |

**Overall: 6.6/10 — Strong hackathon prototype with clear architecture and good documentation. Needs testing, security, and a few bug fixes before any deployment beyond demo.**

---

## 8. Prioritized Fix List

### Critical (fix before demo)

1. **Port bug** — `apiConfig.ts` defaults to `8001`, server runs on `8787`. Mayor chat will fail.
2. **`brightdata/test_sdk.py` stale imports** — will crash if someone tries to run it.

### High (fix for robustness)

3. **Thread-safety in `broadcast_event`** — use `loop.call_soon_threadsafe()` for cross-thread queue writes.
4. **Add try/except to webhook handlers** — processor errors currently return raw 500s.
5. **Add `python-dotenv` to `pyproject.toml`** — explicit dependency.
6. **Housing SSE handler** — frontend receives but ignores housing data. Wire it up or remove the claim.

### Medium (improve quality)

7. **Split `build_civic_services_geojson.py`** — extract 500+ lines of data to a JSON file.
8. **Add webhook payload validation** — Pydantic models for incoming Bright Data payloads.
9. **Add basic auth middleware** — at minimum protect `/admin` and `/api/analysis/run`.
10. **Fix `README.md` path** — `backend/scrape_scheduler.py` → `backend/core/scrape_scheduler.py`.

### Low (nice to have)

11. **Split `appContext.tsx`** — per-feature reducers.
12. **Split `types.ts`** — per-domain type files.
13. **Add pytest + basic tests** — at least for processors and sentiment scoring.
14. **Increase ThreadPoolExecutor workers** — from 2 to 4 so all streams run concurrently.
15. **Cache agent instance** — rebuild mayor agent once, not per request.
