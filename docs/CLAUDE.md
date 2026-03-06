# CLAUDE.md — MontgomeryAI Navigator
> **Owner:** Hamza Khaled Mahmoud Ahmed — AI Engineer & Data Scientist
> **Event:** World Wide Vibes Hackathon (WWV Mar 2026) — GenAI.Works Academy
> **Last Updated:** March 6, 2026
> **Deadline:** March 9, 2026
> **Status:** Phase 5 — Frontend live. News Tab is NEXT.

---

## What We Are Building

**MontgomeryAI** is a civic navigator platform for Montgomery, Alabama. It helps residents navigate benefits, find jobs, access city services, and stay informed — all from one interface.

The frontend is a React + TypeScript + Vite + Tailwind CSS + shadcn/ui app in `montgomery-navigator/`.

### Current Tabs (4 live)

| Tab | View Key | Purpose | Key Components |
|-----|----------|---------|----------------|
| **Profile** | `profile` | Citizen persona dashboard — civic snapshot, benefits, needs, goals, barriers, CV, education, skills | `ProfileView.tsx`, `PersonaSelector.tsx` |
| **Chat** | `chat` | AI-powered conversational assistant — benefits cliff, medicaid, reentry, job cards | `CommandCenter.tsx` (chat column), `ChatInput`, `MessageBubble` |
| **Services** | `services` | Interactive map + directory of 8 service categories (health, community, childcare, education, safety, libraries, parks, police) with ArcGIS data | `ServicesView.tsx`, `ServiceDirectory.tsx`, `ServiceMapView.tsx`, `ServiceGuideCards.tsx` |
| **Career Growth** | `cv` | Job matching, market pulse dashboard, trending skills, upskilling paths, commute estimates | `CvUploadView.tsx`, `JobMatchPanel.tsx`, `MarketPulse.tsx`, `TrendingSkillsBar.tsx` |

### Next Tab to Build: News

| Tab | View Key | Purpose |
|-----|----------|---------|
| **News** | `news` | Real-time Montgomery news feed — Medium-like newsletter UI with citizen comments, development/residency project news |

---

## Architecture

```
montgomery-navigator/
├── public/data/              ← Static JSON data (mock citizens, gov services, jobs, transit)
├── scripts/                  ← Data pipeline scripts (Bright Data triggers, ArcGIS fetch)
├── src/
│   ├── components/app/       ← UI components by feature
│   │   ├── cv/               ← Career Growth tab (16 files)
│   │   ├── services/         ← Services tab (19 files)
│   │   └── *.tsx             ← Shared components (TopBar, FlowSidebar, ChatInput, etc.)
│   ├── lib/                  ← Business logic, data loaders, types
│   │   ├── appContext.tsx     ← Global state (useReducer, 50+ actions)
│   │   ├── types.ts          ← All TypeScript interfaces
│   │   ├── citizenProfiles.ts ← Mock citizen data loader
│   │   ├── jobMatcher.ts     ← Job matching engine
│   │   ├── arcgisService.ts  ← ArcGIS REST API client
│   │   └── ...
│   ├── pages/
│   │   └── CommandCenter.tsx  ← Main app shell (3-column layout)
│   └── main.tsx
```

### State Management

Global state via `useReducer` in `appContext.tsx`. All views read from `state` and dispatch actions. Key state shape defined in `AppState` interface in `types.ts`.

- `state.activeView` controls which tab renders (`"chat" | "cv" | "services" | "profile"`)
- `state.citizenMeta` holds the active citizen persona (or null)
- `state.cvData` holds parsed CV data
- `state.jobMatches`, `state.trendingSkills`, `state.upskillingSummary` drive Career Growth
- `state.servicePoints`, `state.activeCategories` drive Services map

### Data Pillars

1. **ArcGIS REST API** — 31 public endpoints for Montgomery city data (crime, permits, businesses, parks, recreation, payroll, budget). Client in `arcgisService.ts`.
2. **Bright Data** — Live web scraping for jobs (Indeed, LinkedIn, Glassdoor), government sites (Medicaid, DHR), and news. See `docs/bright-data-integration.md` for full API reference.
3. **Mock Data** — 5 realistic citizen personas in `public/data/mock_citizens.json` with 30+ civic fields each, full CVs, goals, and barriers.

---

## Credentials (see `.env.example`)

| Key | Value | Used For |
|-----|-------|----------|
| `BRIGHTDATA_API_KEY` | *(see `.env`)* | Web Scraper API, SERP API, Crawl API |
| Indeed dataset ID | `gd_l4dx9j9sscpvs7no2` | Job scraping |
| LinkedIn dataset ID | `gd_lpfll7v5hcqtkxl6l` | Job scraping |
| Glassdoor dataset ID | `gd_lpfbbndm1xnopbrcr0` | Salary data |

---

## NEXT STAGE: News Tab

### Goal

Build a real-time Montgomery news feed that scrapes, aggregates, and displays local news in a Medium-like newsletter UI. Citizens can read, react, and express opinions. The feed includes both general city news and development/residency project news.

### What the News Tab Must Do

1. **Scrape Montgomery news in real time** using Bright Data SERP API + Web Unlocker
2. **Display articles** in a Medium-style card layout matching the current app theme
3. **Categorize content**: General News, Development & Residency Projects, City Government, Community Events
4. **Enable citizen engagement**: upvote/downvote, comments, share — tied to active citizen persona
5. **Auto-refresh**: new articles appear without page reload (polling or webhook push)

### Scraping Architecture (Bright Data Protocol)

The scraper must use Bright Data's async webhook delivery pattern:

#### Step 1 — SERP API for News Discovery

```
POST https://api.brightdata.com/request
Authorization: Bearer $BRIGHTDATA_API_KEY

{
  "zone": "serp_api1",
  "url": "https://www.google.com/search?q=Montgomery+Alabama+news&tbm=nws&hl=en&gl=us&brd_json=1",
  "format": "json"
}
```

Key parameters:
- `tbm=nws` — Google News results
- `brd_json=1` — Parsed JSON response
- Multiple queries to cover categories:
  - `Montgomery+Alabama+news` (general)
  - `Montgomery+Alabama+development+projects` (development)
  - `Montgomery+Alabama+housing+construction` (residency)
  - `Montgomery+Alabama+city+council` (government)
  - `Montgomery+Alabama+community+events` (events)

#### Step 2 — Web Unlocker for Full Article Content

For each discovered article URL, fetch the full content:

```
POST https://api.brightdata.com/request
Authorization: Bearer $BRIGHTDATA_API_KEY

{
  "zone": "web_unlocker1",
  "url": "https://www.montgomeryadvertiser.com/story/...",
  "format": "raw"
}
```

Then parse the HTML into structured article data (title, author, date, body, images).

#### Step 3 — Webhook Delivery (Production Pattern)

Instead of polling, configure webhook delivery so Bright Data POSTs results directly:

```json
{
  "deliver": {
    "type": "webhook",
    "endpoint": "https://your-server.com/api/news/webhook"
  },
  "input": [{"url": "https://www.google.com/search?q=Montgomery+Alabama+news&tbm=nws&brd_json=1"}]
}
```

The webhook endpoint receives scraped data, parses it, deduplicates, and stores it for the frontend.

#### Step 4 — Polling Script (MVP/Demo Alternative)

For the hackathon demo, a simpler polling approach:

```
scripts/
├── scrape_news.ts          ← Triggers SERP API, polls for results, saves to public/data/news.json
├── scrape_article.ts       ← Takes a URL, fetches full content via Web Unlocker
└── news_pipeline.ts        ← Orchestrator: discover → fetch → deduplicate → save
```

Poll interval: every 15 minutes during demo. Results saved to `public/data/news_feed.json`.

### Frontend Implementation

#### New Files to Create

```
src/
├── components/app/news/
│   ├── NewsView.tsx              ← Main news tab container (category tabs + feed)
│   ├── NewsCard.tsx              ← Individual article card (Medium-style: image, title, excerpt, source, time)
│   ├── NewsDetail.tsx            ← Full article view with citizen comments
│   ├── NewsCategoryTabs.tsx      ← Category filter tabs (All, Development, Government, Community)
│   ├── NewsCommentSection.tsx    ← Citizen comments/opinions tied to active persona
│   └── DevelopmentProjectCard.tsx ← Special card for development/residency projects
├── lib/
│   ├── newsService.ts            ← Fetch news data, polling logic, deduplication
│   └── newsTypes.ts              ← NewsArticle, NewsCategory, NewsComment interfaces
```

#### Types to Define

```typescript
type NewsCategory = "general" | "development" | "government" | "community" | "events";

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  category: NewsCategory;
  publishedAt: string;
  scrapedAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
}

interface NewsComment {
  id: string;
  articleId: string;
  citizenId: string;
  citizenName: string;
  avatarInitials: string;
  avatarColor: string;
  content: string;
  createdAt: string;
}
```

#### State Additions (appContext.tsx)

Add to `AppState`:
- `newsArticles: NewsArticle[]`
- `newsLoading: boolean`
- `newsCategory: NewsCategory`

Add to `AppView`:
- `"news"` union member

Add actions:
- `SET_NEWS_ARTICLES`
- `SET_NEWS_LOADING`
- `SET_NEWS_CATEGORY`

#### UI Design Requirements

- **Medium-like card layout**: large hero image, bold title, 2-line excerpt, source badge, relative time
- **Match current theme**: use existing Tailwind variables (`bg-background`, `text-foreground`, `border-border`, etc.)
- **Category tabs** at the top with active indicator
- **Development projects** get a special card with project status badge (planned, in-progress, completed)
- **Comment section** shows citizen avatar + name (from active persona), text input, threaded replies
- **Pull-to-refresh** on mobile, auto-refresh indicator on desktop
- **Empty state**: "Checking for Montgomery news..." with skeleton cards

### Integration Points

1. **FlowSidebar.tsx** — Add `{ label: "News", view: "news", icon: Newspaper }` to `NAV_ITEMS`
2. **CommandCenter.tsx** — Add `{currentView === "news" && <NewsView />}` render block
3. **MobileNav.tsx** — Add news tab for mobile navigation
4. **types.ts** — Add `"news"` to `AppView` union

### Build Order

1. Define types in `newsTypes.ts`
2. Create mock news data in `public/data/news_feed.json` (10-15 realistic Montgomery articles)
3. Build `newsService.ts` (fetch from static JSON first, Bright Data integration later)
4. Build `NewsCard.tsx` and `NewsCategoryTabs.tsx`
5. Build `NewsView.tsx` container
6. Wire into `CommandCenter.tsx` and `FlowSidebar.tsx`
7. Build `NewsDetail.tsx` with `NewsCommentSection.tsx`
8. Build `DevelopmentProjectCard.tsx`
9. Create `scripts/news_pipeline.ts` for Bright Data scraping
10. Replace static JSON with live scraper output

---

## Key Montgomery News Sources to Scrape

| Source | URL Pattern | Category |
|--------|------------|----------|
| Montgomery Advertiser | `montgomeryadvertiser.com` | General, Government |
| WSFA 12 News | `wsfa.com` | General, Community |
| Alabama Political Reporter | `alreporter.com` | Government |
| Montgomery Area Chamber | `montgomerychamber.com/news` | Development, Business |
| City of Montgomery | `montgomeryal.gov/news` | Government, Development |
| AL.com Montgomery | `al.com/montgomery` | General |

---

## Conventions

- **File length limit**: 150 lines max. Split if exceeded.
- **Function length limit**: 30 lines max. Extract helpers.
- **No auto-commits**: Always stage, show diff, wait for approval.
- **Commit format**: `feat(scope): description`, `fix(scope): description`, etc.
- **Build validation**: Run `npm run build` after changes. 0 errors required.
- **Component pattern**: Each feature gets its own folder under `components/app/`.
- **State pattern**: All state flows through `appContext.tsx` reducer. No local state for shared data.

---

## The Event

| Field | Detail |
|-------|--------|
| **Event** | World Wide Vibes Hackathon (WWV Mar 2026) |
| **Organizer** | GenAI.Works Academy |
| **Submission Deadline** | March 9, 2026 |
| **Prize Pool** | $5,000 |
| **Bonus Points** | Using Bright Data tools (must document explicitly) |
| **Submission** | Working prototype + short demo/presentation |
