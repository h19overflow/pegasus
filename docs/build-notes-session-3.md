# Build Notes: Session 3 — City Pulse Dashboard, Gov Services Scraper, Enhanced Interactivity

**Date**: 2026-03-05 (late session)
**Status**: Complete
**Focus**: Job Market pulse dashboard, government services scraper, advanced job filtering, interactive cards, collapsible guide panel, Parks & Police categories

---

## Table of Contents

1. [Overview](#overview)
2. [Job Market — City Pulse Dashboard](#job-market--city-pulse-dashboard)
3. [Job Market — Advanced Filters & Sorting](#job-market--advanced-filters--sorting)
4. [Job Market — Interactive Cards](#job-market--interactive-cards)
5. [Government Services Scraper](#government-services-scraper)
6. [Services Page — Service Guides](#services-page--service-guides)
7. [Services Page — New Categories](#services-page--new-categories)
8. [Services Page — Search, Situations, Sort](#services-page--search-situations-sort)
9. [Collapsible Guide Panel](#collapsible-guide-panel)
10. [Files Created & Modified](#files-created--modified)
11. [Build Verification](#build-verification)

---

## Overview

This session transformed the Job Market tab from a plain job list into a **city pulse dashboard** with metrics, charts, and professional-grade filtering. The Services tab gained **12 detailed government service guides** with eligibility rules, step-by-step application processes, and required documents — the kind of actionable data that ArcGIS map pins can't provide. Both pages got significant interactivity improvements.

**Key metric:** Zero TypeScript errors, Vite build passes in 4.3s.

---

## Job Market — City Pulse Dashboard

**New file:** `src/components/app/cv/MarketPulse.tsx` (194 lines)

A dashboard section rendered between the search bar and trending skills, giving citizens an instant overview of Montgomery's job market.

### Row 1: Four Metric Cards (grid-cols-2 md:grid-cols-4)

| Card | Value (from 40 jobs) | Detail |
|------|---------------------|--------|
| Active Jobs | 40 | From Indeed & LinkedIn |
| Top Sector | Hospitals and Health Care | 4 open positions |
| Entry Level | 25% | No senior experience needed |
| Avg Competition | 29 | applicants per listing |

Each card has a colored icon (teal, violet, emerald, amber) and uses the existing `rounded-xl border border-border/50 bg-white` design language.

### Row 2: Two Bar Charts (grid-cols-1 md:grid-cols-2)

**Left — Hiring by Industry:** Top 6 industries by job count. Pure CSS horizontal bars (teal). Shows Healthcare, Hospitality, Retail, IT, etc.

**Right — In-Demand Roles:** Job titles grouped by keyword (Nurse, Associate, Manager, Technician, etc.). Pure CSS bars (amber).

### Architecture

All computation is pure — no hooks, no side effects. Five helper functions:
- `countByField()` — generic reduce for grouping
- `computeTopSector()` — highest industry count
- `computeEntryLevelPercent()` — seniority distribution
- `computeAverageApplicants()` — mean of non-null applicant counts
- `extractTitleKeyword()` — maps noisy titles to canonical role buckets

---

## Job Market — Advanced Filters & Sorting

**New file:** `src/components/app/cv/JobFilters.tsx` (198 lines)

Professional job platform filtering, toggled via a "Filters" button.

### Sort Options (always visible)
- **Most Recent** — by posted date descending
- **Best Match** — by match percentage (only shown when CV is uploaded)
- **Salary** — by parsed salary minimum descending

### Filter Panel (expandable)
- **Job Type** — toggle pills: Full-time, Part-time, Contract
- **Experience Level** — toggle pills: Entry level, Mid-Senior level, Director
- **Industry** — dropdown populated from actual job data
- **Clear all** — resets everything

### Salary Parsing
`parseSalaryMinimum()` extracts the first dollar amount from salary strings like `"$28.00 - $42.00/hr"` → 28.

### State Management
Filter state is managed in `JobMatchPanel` via `JobFilterState` interface:
```typescript
interface JobFilterState {
  sortBy: "recent" | "match" | "salary";
  jobTypes: Set<string>;
  seniority: Set<string>;
  industry: string;
}
```

Active filter count shown as a badge on the Filters button.

---

## Job Market — Interactive Cards

**Modified:** `src/components/app/cv/JobMatchCard.tsx` (205 lines)

Cards are now **click-to-expand** instead of static. The entire card header is a button.

### Collapsed State (default)
- Job title, company, source icon, salary, job type, location, posted date
- Match percentage badge (when CV uploaded)
- Chevron down indicator

### Expanded State (on click)
- **Info grid**: Industry, Seniority level, Salary, Applicant count
- **Required Skills**: All skills from the job listing as colored badges
- **Matched Skills** (with CV): Green badges for matching skills
- **Skills to Develop** (with CV): Primary-colored outlined badges for gaps
- **Benefits**: Emerald badges (Health insurance, 401k, PTO, etc.)
- **Actions**: "Apply Now" + "Full Details" buttons (both open in new tab)

### Selection State
`expandedJobId` in `JobMatchPanel` tracks which card is open. Only one card expands at a time (accordion behavior).

---

## Government Services Scraper

**New file:** `scripts/scrape_gov_services.py`

Generates actionable service guides for Montgomery residents. Each guide contains everything needed to actually access a service — not just where it is, but who qualifies, how to apply, and what to bring.

### Output: 12 Services Across 8 Categories

| Category | Service | Provider |
|----------|---------|----------|
| healthcare | Alabama Medicaid | Alabama Medicaid Agency |
| healthcare | Family Health Center (FQHC) | Central Alabama Comprehensive Health |
| food | SNAP (Food Stamps) | Alabama DHR |
| food | WIC | Alabama Dept of Public Health |
| benefits | TANF | Alabama DHR |
| benefits | Alabama 211 Helpline | United Way 211 |
| childcare | Childcare Subsidy Program | Alabama DHR |
| workforce | Montgomery Career Center | Alabama Dept of Labor |
| workforce | Trenholm State Workforce Dev | Trenholm State Community College |
| housing | Section 8 / Public Housing | Montgomery Housing Authority |
| utilities | LIHEAP Energy Assistance | Montgomery Community Action |
| legal | Legal Services Alabama | Legal Services Alabama |

### Per-Service Data Fields

```json
{
  "id": "svc-snap-al",
  "category": "food",
  "title": "SNAP (Food Stamps)",
  "provider": "Alabama Department of Human Resources",
  "description": "Monthly benefits on an EBT card...",
  "eligibility": ["Gross monthly income below 130% FPL...", ...],
  "how_to_apply": ["Apply online at myDHR.alabama.gov", ...],
  "documents_needed": ["Completed DHR-FAD-2116 application", ...],
  "url": "https://dhr.alabama.gov/food-assistance/",
  "phone": "(334) 293-3100",
  "address": "944 S. Perry Street, Montgomery, AL 36104",
  "tags": ["food stamps", "snap", "ebt", "groceries"]
}
```

### Data Sources
- Curated from verified public government information
- Live scrape attempt of montgomeryal.gov/residents (returned 404 — city site restructured)
- Bright Data proxy integration ready for future scraping of protected gov sites

### Output Files
- `scripts/data/gov_services.json`
- `montgomery-navigator/public/data/gov_services.json`

---

## Services Page — Service Guides

**New files:**
- `src/lib/govServices.ts` (89 lines) — data loader, search, cache
- `src/components/app/services/ServiceGuideCards.tsx` (new) — rich expandable guide cards

### Frontend Data Flow
```
/data/gov_services.json
      ↓
fetchServiceGuides() (cached after first load)
      ↓
ServiceDirectory renders ServiceGuideCards
      ↓
Each card expands to show eligibility, steps, documents
```

### ServiceGuideCards Component
- Category-colored icons (healthcare=red, food=orange, childcare=amber, etc.)
- Click to expand: **Who's Eligible**, **How to Apply** (numbered steps), **Documents Needed**
- Contact info (phone, address)
- **"Visit Website"** — opens official government site
- **"Help Me Apply"** — routes to AI chat with pre-filled message

### Integration
ServiceDirectory loads guides on mount via `fetchServiceGuides()`. Search bar filters both map categories AND service guides simultaneously.

---

## Services Page — New Categories

Added **Parks & Recreation** and **Police & Safety** from existing ArcGIS data.

### ArcGIS Layer Config

| Category | ArcGIS Path | Name Field | Geometry |
|----------|-------------|------------|----------|
| parks | Streets_and_POI/FeatureServer/7 | FACILITYID | Polygon → centroid |
| police | HostedDatasets/Police_Facilities/FeatureServer/0 | Facility_Name | Point |

### Polygon Centroid Extraction
Parks layer returns Polygon geometry (park boundaries). Added `computePolygonCentroid()` to `arcgisService.ts` — averages all coordinates in the first ring to produce a center point for map markers.

### Where They Appear
- ServiceDirectory: two new category cards with Trees and Shield icons
- ServiceDetailView: full drill-down with map and location list
- ServiceMapView: toggleable category filters on the all-services map

---

## Services Page — Search, Situations, Sort

### Search Bar (ServiceDirectory)
Filters category cards by label/description AND individual service point names/addresses. Also filters service guides by title, description, provider, and tags.

### Situation Quick Cards
Three horizontal pills above the category grid:
- "I need medical help" → health category
- "I need childcare" → childcare category
- "I need job training" → education category

### Search Within Category (ServiceDetailView)
Filters the 380px location list by name or address.

### Sort Options (ServiceDetailView)
- **A-Z**: alphabetical by name
- **Nearest**: requests browser geolocation, computes Haversine distance, sorts ascending. Falls back to A-Z if geolocation denied.

### Extracted Files (from agent refactoring)
The services agent split ServiceDetailView and ServiceDirectory into smaller files:
- `serviceCategories.ts` — category card configs + situation cards
- `serviceCategoryMeta.ts` — CATEGORY_META + MAP_CATEGORIES
- `serviceDetailUtils.ts` — distance computation + filterAndSortPoints
- `ServiceDirectoryParts.tsx` — DirectoryHero, SearchBar, SituationCards, CategoryCard, HelpPrompt
- `ServiceDetailHeader.tsx` — back button + category header
- `ServiceListPanel.tsx` — search + sort + location cards
- `serviceDetailHelpers.tsx` — ServiceLocationCard + expanded details
- `MapPointDetailPanel.tsx` — point detail panel for map view

---

## Collapsible Guide Panel

**Modified:** `src/components/app/ContextPanel.tsx`

The Services Guide (AI chat sidebar) is now collapsible with a friendly teaser.

### Collapsed State (default, 52px wide)
- Vertical strip with MessageCircle icon
- "Ask Guide" text rendered vertically
- Green pulse dot indicating guide is ready
- Click to expand

### Expanded State (380px)
- Full ServiceGuideChat with header showing "Services Guide"
- Collapse button (ChevronRight) in header
- Smooth 300ms transition between states

### ServiceGuideChat Update
Added `hideHeader` prop to avoid duplicate headers when the ContextPanel provides its own.

---

## Files Created & Modified

### New Files (this session)

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/app/cv/MarketPulse.tsx` | 194 | City pulse dashboard with metrics + charts |
| `src/components/app/cv/JobFilters.tsx` | 198 | Advanced filter panel with sort + filter |
| `src/lib/govServices.ts` | 89 | Government services data loader |
| `src/components/app/services/ServiceGuideCards.tsx` | ~200 | Rich expandable guide cards |
| `scripts/scrape_gov_services.py` | ~560 | Government services scraper |
| `scripts/data/gov_services.json` | — | 12 service guide records |
| `public/data/gov_services.json` | — | Frontend copy |
| `src/components/app/services/serviceCategories.ts` | 99 | Category card configs |
| `src/components/app/services/serviceCategoryMeta.ts` | 97 | Category meta for detail/map views |
| `src/components/app/services/serviceDetailUtils.ts` | 43 | Distance + filter helpers |
| `src/components/app/services/ServiceDirectoryParts.tsx` | 127 | Directory sub-components |
| `src/components/app/services/ServiceDetailHeader.tsx` | 37 | Detail view header |
| `src/components/app/services/ServiceListPanel.tsx` | 97 | Search + sort + list |
| `src/components/app/services/serviceDetailHelpers.tsx` | 132 | Location card + details |
| `src/components/app/services/MapPointDetailPanel.tsx` | 90 | Map point detail panel |

### Modified Files (this session)

| File | What Changed |
|------|-------------|
| `src/components/app/cv/JobMatchPanel.tsx` | Added MarketPulse, JobFilters, expandable card state |
| `src/components/app/cv/JobMatchCard.tsx` | Click-to-expand with full details, benefits, actions |
| `src/components/app/ContextPanel.tsx` | Collapsible guide panel for services view |
| `src/components/app/services/ServiceGuideChat.tsx` | Added `hideHeader` prop |
| `src/components/app/services/ServiceDirectory.tsx` | Added service guides, search integration |
| `src/components/app/services/ServiceDetailView.tsx` | Search, sort, refactored into parts |
| `src/components/app/services/ServiceMapView.tsx` | Parks + Police categories |
| `src/lib/types.ts` | Added "parks" and "police" to ServiceCategory |
| `src/lib/arcgisService.ts` | Parks + Police layers, polygon centroid extraction |

---

## Build Verification

```
TypeScript:  0 errors (npx tsc --noEmit)
Vite build:  ✓ built in 4.32s
Dev server:  running at http://localhost:5173
```

All changes are backward-compatible. No breaking changes to existing state or components.
