# Build Notes: Session 2 — Career Growth & Services Tab Redesign

**Date**: 2026-03-05
**Status**: Complete
**Focus**: Career Growth (Job Market + Upskilling + Commute), Services Tab (Healthcare + Community + Education), Job Scraping Pipeline, Transit Integration

---

## Table of Contents

1. [Overview](#overview)
2. [Career Growth Tab Redesign](#career-growth-tab-redesign)
3. [Services Tab Redesign](#services-tab-redesign)
4. [Engines & Services](#engines--services)
5. [Data Scrapers & Pipeline](#data-scrapers--pipeline)
6. [Data Files](#data-files)
7. [Architecture Changes](#architecture-changes)
8. [ArcGIS Integration](#arcgis-integration)
9. [Transit Data Pipeline](#transit-data-pipeline)
10. [Bright Data Configuration](#bright-data-configuration)
11. [File Structure Reference](#file-structure-reference)

---

## Overview

This session delivered two major feature areas:

- **Career Growth Tab**: Replaced static CV analysis with interactive Job Market, Upskilling, and Commute panels. Integrated 40+ real jobs from Indeed/LinkedIn, Montgomery-based training options, and MATS transit routes.
- **Services Tab**: Apple-inspired directory landing with 6 service categories, full-map view with toggleable filters, detail views with real ArcGIS data from 354 service points across Montgomery.

**Key Metrics**:
- 40 jobs: 18 Indeed + 20 LinkedIn + 2 manual
- 6 service categories: Healthcare (36), Community (23), Daycare (178), Education (90), Fire (15), Libraries (12)
- 14 MATS transit routes scraped
- 70+ job-related skill keywords across 7 categories

---

## Career Growth Tab Redesign

### Components

#### **CvUploadView.tsx**
**Location**: `montgomery-navigator/src/components/app/cv/CvUploadView.tsx`

Redesigned Career Growth interface with 3 main tabs:
- **Job Market** - JobMatchPanel + TrendingSkillsBar
- **Upskilling** - UpskillingPanel with impact metrics and training options
- **Commute** - CommutePanel with interactive map + job list

Shows CitizenProfileBar when CV is uploaded.

#### **CitizenProfileBar.tsx**
**Location**: `montgomery-navigator/src/components/app/cv/CitizenProfileBar.tsx`

Compact sidebar displayed when CV is uploaded:
- User profile metadata (name, location, current role)
- Quick stats (years experience, top skills)
- Edit CV button

#### **JobMatchPanel.tsx**
**Location**: `montgomery-navigator/src/components/app/cv/JobMatchPanel.tsx`

Interactive job listing with search and filtering:
- **Data Source**: 40 jobs from GeoJSON (indeed + LinkedIn + manual)
- **Search**: Full-text search on job title, company, description
- **Filter**: By salary range, job type, remote status
- **Match Display**: Skill match percentage for each job
- **Actions**: Two real `<a>` tag buttons:
  - "Apply Now" → `applyLink` if available, else `url`
  - "Details" → `url` (Indeed/LinkedIn job page)

#### **JobMatchCard.tsx**
**Location**: `montgomery-navigator/src/components/app/cv/JobMatchCard.tsx`

Individual job card component:
- Job title, company, location
- Salary range (if available)
- Job type badge
- Match percentage (computed by jobMatcher.ts)
- Apply Now & Details buttons as real `<a>` tags with proper href attributes

#### **TrendingSkillsBar.tsx**
**Location**: `montgomery-navigator/src/components/app/cv/TrendingSkillsBar.tsx`

Horizontal bar chart visualization:
- Top 10 in-demand skills from loaded jobs
- Bar width proportional to job count
- Skill name + count label
- Responsive design (scrolls on mobile)

#### **UpskillingPanel.tsx**
**Location**: `montgomery-navigator/src/components/app/cv/UpskillingPanel.tsx`

Two-section layout:
1. **Impact Overview**
   - Current match rate (with CV)
   - Projected match rate (with recommended upskills)
   - Visual difference indicator

2. **Quick Wins & Highest-Impact Skills**
   - Quick Wins: Skills achievable in ≤2 weeks
   - Highest-Impact: Ranked by match improvement potential
   - Each skill includes:
     - Training provider (from Montgomery area)
     - Estimated weeks to learn
     - Cost (if available)
     - Difficulty (Basic/Intermediate/Advanced)

#### **CommutePanel.tsx**
**Location**: `montgomery-navigator/src/components/app/cv/CommutePanel.tsx`

Split-pane commute analysis:
- **Top 45%**: Leaflet map with:
  - Job pins (navy blue)
  - User location (green pulsing dot)
  - Distance/time overlays on hover
  - Click to select job

- **Bottom 55%**: Scrollable commute list
  - Sort by: Distance | Driving Time | Transit Time
  - Each entry shows:
    - Job title + company
    - Distance (miles)
    - Driving time (est.)
    - Transit time (est.)
    - Walk feasibility (if < 3 miles)

---

## Services Tab Redesign

### Architecture

Routes between 3 views:
1. **Directory** - ServiceDirectory.tsx (landing)
2. **Map** - ServiceMapView.tsx (full layer map)
3. **Detail** - ServiceDetailView.tsx (category drill-down)

### Components

#### **ServicesView.tsx**
**Location**: `montgomery-navigator/src/components/app/services/ServicesView.tsx`

Main router component. Manages view state and navigation.

#### **ServiceDirectory.tsx**
**Location**: `montgomery-navigator/src/components/app/services/ServiceDirectory.tsx`

Apple-inspired landing:
- **6 Category Cards** (spacious layout):
  1. Healthcare - 36 facilities
  2. Childcare - 178 facilities
  3. Education - 90 facilities
  4. Community - 23 centers
  5. Libraries - 12 locations
  6. Safety - 15 fire stations

- **CTA Buttons**:
  - "View all on map" → ServiceMapView
  - "Not sure where to start?" → Contextual help (open Guide with civic.services_help action)

#### **ServiceDetailView.tsx**
**Location**: `montgomery-navigator/src/components/app/services/ServiceDetailView.tsx`

Category drill-down with:
- **Top 45%**: Leaflet map, service pins color-coded by category
- **Bottom 55%**: Scrollable list of services
  - Expandable accordion cards
  - Service name, address, phone, hours
  - Google Maps "Directions" link (uses service lat/lon)
  - "Help me prepare" button → Opens Guide with civicActions

#### **ServiceMapView.tsx**
**Location**: `montgomery-navigator/src/components/app/services/ServiceMapView.tsx`

Full-screen map view:
- **Layered Map** with toggleable category filters
- **Color Coding**: Each category has distinct color
- **Legend Overlay**: Show/hide on demand
- **Side Detail Panel**: Click any service → expand details
- **Responsive**: Full-height on mobile, side panel on desktop

---

## Engines & Services

### **upskillingEngine.ts**
**Location**: `montgomery-navigator/src/lib/upskillingEngine.ts`

Skill gap analysis and upskilling recommendations.

**Key Functions**:
- `analyzeSkillGaps()` - Compare CV skills vs job market
- `getHighestImpactSkills()` - Rank skills by match improvement
- `getQuickWins()` - Filter skills learnable in ≤2 weeks
- `getLocalTrainingOptions()` - Map skills to Montgomery providers

**Data Maps**:
- `MONTGOMERY_TRAINING` - Maps skill → [provider, weeks, cost]
  - Trenholm State Community College
  - Montgomery City Library
  - Red Cross
  - IBEW Local
  - CoderFoundry
  - And more

- `WEEKS_ESTIMATE` - Skill → estimated weeks to proficiency

**Output**: UpskillingSummary with projected match improvement

### **commuteEngine.ts**
**Location**: `montgomery-navigator/src/lib/commuteEngine.ts`

Commute time and distance calculations.

**Distance Calculation**: Haversine formula (lat/lon → miles)

**Time Estimation**:
- **Driving**: 25 mph average
- **Transit**: 12 mph + 10 min wait time (based on MATS frequency)
- **Walking**: 3 mph, max 3 miles feasibility

**Output**: CommuteEstimate[] with distance + driving time + transit time

### **transitService.ts**
**Location**: `montgomery-navigator/src/lib/transitService.ts`

MATS (Montgomery Area Transit System) route loader.

**Data Source**: `/public/data/transit_routes.json` (scraped from themtransit.com)

**Routes** (14 fixed routes):
1. Route 1 - AUM Eastchase
2. Route 2 - Eastdale Mall
3. Route 3 - Montgomery Commons
4. Route 4 - Boylston
5. Route 5 - McGhee Road
6. Route 6 - Southlawn Twingates
7. Route 7 - Maxwell AFB
8. Route 8 - Gunter Annex
9. Route 9 - Virginia Loop
10. Route 10 - South Court St.
11. Route 11 - Rosa Parks / South Blvd.
12. Route 12 - Smiley Court Gibbs Village
13. Route 16 - East-West Connector
14. Route 17 - Boulevard

**Fallback**: If file missing, returns empty array with console warning.

### **jobService.ts**
**Location**: `montgomery-navigator/src/lib/jobService.ts`

Job data loader from GeoJSON.

**Data Source**: `/public/data/jobs.geojson` (40 jobs)

**Parsing**: Converts GeoJSON features → JobListing objects with:
- Title, company, location
- Salary range (if available)
- Job type, remote status
- URL, applyLink
- Coordinates (lat, lon)
- Description, requirements

**Fallback**: Returns empty array if file missing.

### **jobMatcher.ts**
**Location**: `montgomery-navigator/src/lib/jobMatcher.ts`

Skill matching engine.

**Algorithm**:
1. Extract skills from job description + requirements (70+ keywords across 7 categories)
2. Normalize CV skills (lowercase, trim)
3. Compute match percentage: (matched skills / required skills) × 100
4. Return JobMatch[] with per-job match scores

**Skill Categories**:
- Languages (Python, JavaScript, TypeScript, etc.)
- Frontend (React, Vue, Angular, etc.)
- Backend (Node.js, Django, FastAPI, etc.)
- Databases (PostgreSQL, MongoDB, etc.)
- DevOps (Docker, Kubernetes, CI/CD, etc.)
- Soft Skills (Leadership, Communication, etc.)
- Other (Git, APIs, Testing, etc.)

---

## Data Scrapers & Pipeline

### **scripts/job_scraper_service.py**
**Location**: `scripts/job_scraper_service.py`

Full job scraping pipeline:

**Workflow**:
1. **Trigger Bright Data** → POST to snapshot API with dataset ID
2. **Poll Status** → GET /query/{queryId} until ready (max 5 min)
3. **Download Results** → GET /data with proper auth headers
4. **Extract Skills** → Parse job description, match against keyword list
5. **Geocode** → Multi-strategy:
   - ArcGIS Business License API (primary)
   - Nominatim (fallback)
   - City centroid (final fallback for Montgomery, AL)
6. **Build GeoJSON** → FeatureCollection with all metadata
7. **Output** → `scripts/data/jobs_latest.geojson` + raw JSON files

**Supported Datasets**:
- Indeed: `gd_l4dx9j9sscpvs7no2`
- LinkedIn: `gd_lpfll7v5hcqtkxl6l`
- Glassdoor: `gd_lpfbbndm1xnopbrcr0`

**Skill Extraction** (7 categories, 70+ keywords):
- Languages, Frontend, Backend, Databases, DevOps, Soft Skills, Other
- Case-insensitive matching with word boundaries

**Error Handling**:
- Timeout (300s polling window)
- Missing coordinates → fallback to city centroid
- Invalid JSON → skip record
- API failures → logged with context

### **scripts/scrape_transit.py**
**Location**: `scripts/scrape_transit.py`

MATS route scraper using BeautifulSoup.

**Data Source**: themtransit.com

**Output**:
- `scripts/data/transit_routes.json` (source of truth)
- `montgomery-navigator/public/data/transit_routes.json` (auto-copied)

**Data Structure**:
```json
{
  "routes": [
    {
      "routeNumber": 1,
      "routeName": "AUM Eastchase",
      "description": "...",
      "estimatedTime": "45 mins",
      "frequency": "30 min"
    }
  ]
}
```

**Note**: MATS has no public GTFS feed; scraping captures fixed route info only.

### **scripts/build_civic_services_geojson.py**
**Location**: `scripts/build_civic_services_geojson.py`

ArcGIS service layer fetcher.

**Data Sources** (6 public ArcGIS layers, no auth):
1. Health Care Facilities (36 points)
2. Community Centers (23 points)
3. Daycare Centers (178 points)
4. Education Facilities (90 points)
5. Fire Stations (15 points)
6. Libraries (12 points)

**Total**: 354 service points across Montgomery area

**Output**: `scripts/civic_services.geojson` (GeoJSON FeatureCollection)

**Features**:
- Full service metadata (name, address, phone, hours, etc.)
- Coordinates for mapping
- Category classification

---

## Data Files

### Job Data
- **Source**: `scripts/data/jobs_latest.geojson` (GeoJSON FeatureCollection, 40 jobs)
- **Published**: `montgomery-navigator/public/data/jobs.geojson`
- **Composition**:
  - 18 Indeed jobs (dataset: gd_l4dx9j9sscpvs7no2)
  - 20 LinkedIn jobs (dataset: gd_lpfll7v5hcqtkxl6l)
  - 2 Manual jobs (testing/backup)
- **Schema**: JobListing (title, company, location, salary, jobType, remoteStatus, url, applyLink, description, requirements, lat, lon)

### Raw Scrape Data
- **Indeed**: `scripts/data/raw/indeed_20260305_135231.json` (raw Bright Data response)
- **LinkedIn**: `scripts/data/raw/linkedin_20260305_135413.json` (raw Bright Data response)

### Transit Data
- **Source**: `scripts/data/transit_routes.json` (14 MATS routes)
- **Published**: `montgomery-navigator/public/data/transit_routes.json`
- **Schema**: TransitRoute (routeNumber, routeName, description, estimatedTime, frequency)

### Civic Services Data
- **Source**: `scripts/civic_services.geojson` (354 service points)
- **Not yet published** to public/ (frontend fetches live via arcgisService.ts)
- **Schema**: ServicePoint (category, name, address, phone, hours, lat, lon, website, notes)

---

## Architecture Changes

### **CommandCenter.tsx**
**Location**: `montgomery-navigator/src/pages/CommandCenter.tsx`

- ContextPanel now visible for BOTH chat view AND services view
- Previously only showed for chat
- Improves context awareness across tabs

### **appContext.tsx**
**Location**: `montgomery-navigator/src/lib/appContext.tsx`

**New State Actions**:
- `SET_UPSKILLING_SUMMARY` - UpskillingSummary
- `SET_TRANSIT_ROUTES` - TransitRoute[]
- `SET_COMMUTE_ESTIMATES` - CommuteEstimate[]
- `ADD_SERVICE_POINTS` - ServicePoint[]
- `SET_JOB_LISTINGS` - JobListing[]
- `SET_JOB_MATCHES` - JobMatch[]
- `SET_TRENDING_SKILLS` - TrendingSkill[]
- `SET_JOBS_LOADING` - boolean

### **types.ts**
**Location**: `montgomery-navigator/src/lib/types.ts`

**New Types**:

```typescript
// Upskilling
UpskillPath {
  skill: string
  currentLevel: string
  targetLevel: string
  estimatedWeeks: number
  provider: TrainingOption
}

TrainingOption {
  name: string
  location: string
  cost?: number
  link?: string
}

UpskillingSummary {
  currentMatchRate: number
  projectedMatchRate: number
  quickWins: UpskillPath[]
  highestImpactSkills: UpskillPath[]
}

// Transit
TransitRoute {
  routeNumber: number
  routeName: string
  description: string
  estimatedTime: string
  frequency: string
}

CommuteEstimate {
  jobId: string
  distance: number
  drivingTime: number
  transitTime: number
  isWalkable: boolean
}

// Services
ServicePoint {
  id: string
  category: ServiceCategory
  name: string
  address: string
  phone?: string
  hours?: string
  lat: number
  lon: number
  website?: string
  notes?: string
}

ServiceCategory = 'healthcare' | 'childcare' | 'education' | 'community' | 'libraries' | 'safety'

// Civic Actions & Guide Messages
CivicAction {
  action: string
  parameters?: Record<string, any>
}

GuideMessage {
  type: 'civic.services_help' | 'civic.job_market_help' | ...
  message: string
  metadata?: Record<string, any>
}

// Jobs
JobSkills {
  [category: string]: string[]
}

JobListing {
  id: string
  title: string
  company: string
  location: string
  salaryMin?: number
  salaryMax?: number
  jobType: string
  remoteStatus: string
  url: string
  applyLink?: string
  description: string
  requirements: string
  lat: number
  lon: number
}

JobMatch {
  jobId: string
  matchPercentage: number
  matchedSkills: string[]
  missingSkills: string[]
}

TrendingSkill {
  skill: string
  count: number
  category: string
}
```

---

## ArcGIS Integration

### **arcgisService.ts**
**Location**: `montgomery-navigator/src/lib/arcgisService.ts`

ArcGIS REST API client for service layer fetching.

**31 Public Endpoints Verified** (no authentication required):
- Health Care Facilities
- Community Centers
- Daycare Centers
- Education Facilities
- Fire Stations
- Libraries

**Frontend Behavior**:
- Lazy loads layers on demand (not at startup)
- Caches in app state (AppContext)
- Parses ArcGIS JSON → ServicePoint objects
- Converts to GeoJSON for map rendering

**Error Handling**:
- Network failures → console warning, continue with empty array
- Parsing errors → skip bad records

---

## Transit Data Pipeline

### MATS System Overview

**Problem**: MATS (Montgomery Area Transit System) has no public GTFS feed

**Solution**: Scrape fixed route information from themtransit.com

**Routes Captured** (14 fixed routes):
- Cross-city connectors: Route 1 (AUM), Route 3 (Montgomery Commons), Route 16 (East-West)
- Neighborhood circulators: Route 2 (Eastdale), Route 4 (Boylston), Route 5 (McGhee)
- Military bases: Route 7 (Maxwell AFB), Route 8 (Gunter Annex)
- South side: Route 11 (Rosa Parks), Route 12 (Gibbs Village), Route 6 (Southlawn)
- East side: Route 9 (Virginia Loop), Route 10 (South Court)
- Connector: Route 17 (Boulevard)

### Frontend Integration

**commuteEngine.ts** estimates transit time:
- Base speed: 12 mph (realistic for urban transit)
- Wait time: 10 min per route (based on typical 15-30 min frequency)
- Formula: `(distance / 12) + 10 + (number_of_routes * 5)` minutes

**Limitations**:
- No real schedule data (no GTFS)
- No actual stop locations
- Estimates are approximations based on route patterns

---

## Bright Data Configuration

### API Credentials
- **Endpoint**: https://api.brightdata.com
- **Auth**: X-Auth-Token header
- **Base Path**: /api/query

### Job Scraping Datasets

| Source | Dataset ID | Status |
|--------|-----------|--------|
| Indeed | `gd_l4dx9j9sscpvs7no2` | Active, 18 jobs extracted |
| LinkedIn | `gd_lpfll7v5hcqtkxl6l` | Active, 20 jobs extracted |
| Glassdoor | `gd_lpfbbndm1xnopbrcr0` | Configured, not yet used |

### Workflow Steps

1. **Trigger**: POST `/api/query` with dataset ID + filters
2. **Receive**: queryId for polling
3. **Poll**: GET `/api/query/{queryId}` until status = 'ready'
4. **Download**: GET `/api/query/{queryId}/data` with params
5. **Parse**: JSON lines → skill extraction → geocoding → GeoJSON

### Error Handling
- Timeout after 5 min polling (300s)
- Rate limits respected (delays between requests)
- Failed geocodes fall back to city centroid
- Skill extraction handles missing descriptions gracefully

---

## File Structure Reference

### Frontend Components
```
montgomery-navigator/src/components/app/
├── cv/
│   ├── CvUploadView.tsx          # Main Career Growth tab router
│   ├── CitizenProfileBar.tsx     # Sidebar when CV uploaded
│   ├── JobMatchPanel.tsx         # Job listing with search/filter
│   ├── JobMatchCard.tsx          # Individual job card
│   ├── TrendingSkillsBar.tsx     # Horizontal skill chart
│   ├── UpskillingPanel.tsx       # Impact + quick wins + recommendations
│   └── CommutePanel.tsx          # Map + commute list
└── services/
    ├── ServicesView.tsx          # Main Services router
    ├── ServiceDirectory.tsx      # Apple-style category landing
    ├── ServiceDetailView.tsx     # Category drill-down + map
    └── ServiceMapView.tsx        # Full-screen layer map
```

### Backend/Data Services
```
montgomery-navigator/src/lib/
├── arcgisService.ts              # ArcGIS REST client
├── civicActions.ts               # Guide action handlers (TBD)
├── commuteEngine.ts              # Distance/time calculations
├── guideResponses.ts             # Civic guide message templates (TBD)
├── jobMatcher.ts                 # Skill matching algorithm
├── jobService.ts                 # Job GeoJSON loader
├── leafletSetup.ts               # Leaflet map config (TBD)
├── mockJobData.ts                # Fallback test data (TBD)
├── transitService.ts             # MATS route loader
└── upskillingEngine.ts           # Skill gap + recommendations
```

### Scripts & Data
```
scripts/
├── job_scraper_service.py        # Bright Data pipeline
├── scrape_transit.py             # MATS web scraper
├── build_civic_services_geojson.py  # ArcGIS fetcher
└── data/
    ├── jobs_latest.geojson       # 40 jobs (source of truth)
    ├── transit_routes.json       # 14 MATS routes
    ├── civic_services.geojson    # 354 service points
    └── raw/
        ├── indeed_20260305_135231.json
        └── linkedin_20260305_135413.json

montgomery-navigator/public/data/
├── jobs.geojson                  # Published job data
└── transit_routes.json           # Published transit data
```

### Configuration
```
.env.example                       # Environment template (Bright Data API key, etc.)
```

---

## Key Design Decisions

### Job Matching Strategy
- **Skill Extraction**: 70+ keywords across 7 categories (not ML-based)
- **Matching**: Simple keyword matching, case-insensitive
- **Rationale**: Fast, deterministic, easy to audit and modify

### Commute Estimation
- **No Real GTFS**: MATS lacks public schedule → estimates only
- **Base Speeds**: Driving 25 mph, Transit 12 mph + 10 min wait
- **Rationale**: Provides reasonable ballpark; users understand estimates, not exact

### Service Data Sourcing
- **ArcGIS Public Layers**: No auth needed, regularly maintained by County
- **Lazy Loading**: Fetch on demand, cache in app state
- **Rationale**: Reduces startup load, stays fresh without manual updates

### Training Provider Map
- **Hardcoded in Code**: MONTGOMERY_TRAINING in upskillingEngine.ts
- **Rationale**: Small dataset (< 20 providers), changes infrequently, fast lookup

---

## Known Limitations & Future Work

1. **MATS Transit Data**
   - No real-time schedule or stop locations
   - Estimates are approximations
   - Future: Integrate actual GTFS if MATS publishes

2. **Geocoding**
   - Multi-strategy fallback (ArcGIS → Nominatim → city centroid)
   - Accuracy varies; some jobs map to city center vs exact address
   - Future: Validate with manual spot-checks

3. **Skill Extraction**
   - Keyword-based, not semantic understanding
   - Cannot detect skill nuances (e.g., "Python expert" vs "Python beginner")
   - Future: Train ML model on job descriptions

4. **Service Data**
   - 354 points from ArcGIS; not all providers captured
   - Hours/phone may be outdated
   - Future: Sync with live provider APIs (health departments, school boards)

5. **Training Options**
   - Curated manually; not exhaustive
   - Costs may be outdated
   - Future: Integrate with community college registrar APIs

---

## Session Deliverables Checklist

- [x] CvUploadView redesign with 3 tabs
- [x] JobMatchPanel with search/filter + real data (40 jobs)
- [x] TrendingSkillsBar visualization
- [x] UpskillingPanel with local training options
- [x] CommutePanel with map + time estimates
- [x] CitizenProfileBar sidebar
- [x] ServiceDirectory landing (Apple design)
- [x] ServiceDetailView with map + list
- [x] ServiceMapView with filters
- [x] upskillingEngine.ts
- [x] commuteEngine.ts
- [x] jobMatcher.ts
- [x] transitService.ts
- [x] jobService.ts
- [x] arcgisService.ts
- [x] job_scraper_service.py (Bright Data pipeline)
- [x] scrape_transit.py (MATS routes)
- [x] build_civic_services_geojson.py (ArcGIS layers)
- [x] jobs.geojson (40 real jobs)
- [x] transit_routes.json (14 MATS routes)
- [x] civic_services.geojson (354 service points)
- [x] AppContext actions (upskilling, transit, commute, services, jobs)
- [x] types.ts extended (UpskillingSummary, ServicePoint, JobListing, etc.)

---

## Git Status

- Modified files: `.gitignore`, `package.json`, 9 components, `appContext.tsx`, `types.ts`, `main.tsx`
- Untracked: 19 new components/services, 5 docs, 3 scripts, data directory
- Ready for commit (no merge conflicts, all builds valid)

---

## References

- **Bright Data Docs**: https://brightdata.com/api-documentation
- **ArcGIS REST API**: https://resources.arcgis.com/en/help/arcgis-rest-api/
- **Leaflet Docs**: https://leafletjs.com
- **MATS Website**: https://www.montgomerytransit.org/

---

**End of Session 2 Build Notes**
