# CLAUDE.md — WWV Hackathon Working Memory
> **Owner:** Hamza Khaled Mahmoud Ahmed — AI Engineer & Data Scientist
> **Event:** World Wide Vibes Hackathon (WWV Mar 2026) — GenAI.Works Academy
> **Last Updated:** March 4, 2026
> **Status:** 🔨 Phase 3 IN PROGRESS — Dual-platform COMMITTED. Modular decomposition complete. Build sprint begins next.

---

## 🎯 Current Direction

**BUILD BOTH — MontgomeryAI dual-agent platform (COMMITTED)**
Both tracks earned STRONG GO in Phase 2. Architecture is shared (ETL → DuckDB → ChromaDB → LangChain → Streamlit). Two agents, two Streamlit tabs, one platform.

**Phase 3 mandate:** Modular decomposition → individual module PLAN.md files written → build sprint Day 1.

**Key open question resolved this session:**
The civic access entitlement + form-guide data gap is REAL. The city's ArcGIS portal has NO benefit eligibility rules and NO form completion guides. This data MUST come from Bright Data web scraping (Alabama Medicaid site, Alabama DHR, city permit pages, 211 network). This makes Bright Data critical for CivicGuide, not just a bonus.

---

## 📁 Documents Produced

| File | What It Contains |
|------|-----------------|
| `WWV_Hackathon_Brief.docx` | Event overview, all 4 tracks, prize breakdown, verdicts, strategy |
| `Montgomery_Data_Architecture_Brief.docx` | Full dataset catalog (8 confirmed), hybrid ML/Agentic architecture, 5-day sprint roadmap |
| `GenAI_Works_Company_Intelligence.docx` | Company deep-dive: Steve Nouri, products, tech stack, financials, valuation, strategic verdict |
| `MontgomeryAI_Product_Overview_Brief.docx` | High-level product overview — problem statement, personas, 3-step UX flow, differentiators, objectives, tech snapshot |
| `MontgomeryAI_Technical_Feasibility_Data_Catalog.docx` | Full dataset catalog (40+ sources), Bright Data integration, 5-day feasibility, data-to-feature mapping |
| `tracks/workforce_growth/raw_data/findings.json` | Raw data: BLS OEWS, Census ACS, Alabama ACCCP — 9 data domains, 40+ confirmed figures |
| `tracks/workforce_growth/Workforce_Growth_Track_Commitment_Memo.docx` | Phase 2 deliverable — full GO verdict, persona "Marcus", problem statement, impact metrics, MVP scope |
| `tracks/civic_access/raw_data/findings.json` | Raw data: Census ACS, Medicaid unwinding, digital divide, crime, benefits gap — 10 data domains, 30+ confirmed figures |
| `tracks/civic_access/Civic_Access_Track_Commitment_Memo.docx` | Phase 2 deliverable — full GO verdict, persona "Dorothy", problem statement, impact metrics, MVP scope, Civic vs Workforce comparison |

---

## 🏗️ Module Structure (Phase 3 — Active)

See `modules/README.md` for the full dependency map and build order.

```
modules/
├── README.md                        ← Master map: dependencies + build order
├── shared/
│   ├── M00_etl_arcgis/              ← ArcGIS REST ingestion → DuckDB
│   ├── M01_storage/                 ← DuckDB + ChromaDB setup
│   └── M02_rag_pipeline/            ← Embedding + retrieval (shared by both agents)
├── civic_guide/
│   ├── M03_bright_data_scraper/     ← Scrape: Medicaid, DHR, 311, permit guides
│   ├── M04_benefit_eligibility/     ← Rules engine: profile → eligible programs
│   ├── M05_form_navigator/          ← RAG over scraped form guides
│   └── M06_civic_agent/             ← LangChain ReAct agent + tools
└── career_path/
    ├── M07_bright_data_jobs/        ← Scrape: Indeed + LinkedIn job postings
    ├── M08_skill_gap_extractor/     ← spaCy NER on JDs → O*NET matching
    ├── M09_job_matcher/             ← User profile → ranked job recommendations
    └── M10_workforce_agent/         ← LangChain ReAct agent + tools
```

**Shared frontend** (Streamlit, 2-tab shell) built last, after both agents are wired.

---

## 🗄️ Data Sources — Two Confirmed Pillars

### Pillar 1 — Montgomery ArcGIS Feature Services (City Official API)
**Base URL:** `https://services.arcgis.com/[ID]/arcgis/rest/services/[Layer]/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson`
**Auth:** None. Fully public.

| Dataset | Track Relevance | Module |
|---------|----------------|--------|
| Business License Data | Civic HIGH / Workforce HIGH | M00 |
| Building Permits (2014–present) | Workforce HIGH | M00 |
| Crime Statistics | Civic HIGH | M00 |
| Crime Mapping (GeoJSON) | Civic HIGH | M00 |
| Open Checkbook (City Budget) | Civic HIGH / Workforce HIGH | M00 |
| Open Payroll (City Salaries) | Workforce HIGH | M00 |
| City Recreation | Civic HIGH | M00 |
| General Permits | Civic MED | M00 |

### Pillar 2 — Bright Data (Live Web + Government Sites)
**Products used:** Web Scraper API (pre-built) + Web Unlocker API
**Cost estimate:** ~$2–5 total for hackathon volume. Signup credits cover it entirely.
**Bonus points:** Must document Bright Data usage explicitly in submission.

| Scraping Target | What It Provides | Module | Critical? |
|----------------|-----------------|--------|-----------|
| LinkedIn Jobs (Montgomery, AL) | Live job titles, skills, salary, employer | M07 | 🔴 Yes |
| Indeed Jobs (Montgomery, AL) | Job descriptions, qualifications, job type | M07 | 🔴 Yes |
| Alabama Medicaid (medicaid.alabama.gov) | Eligibility criteria, application steps | M03 | 🔴 Yes |
| Alabama DHR (dhr.alabama.gov) | SNAP, TANF, childcare rules + forms | M03 | 🔴 Yes |
| Alabama 211 (al211.org) | Community resource directory for Montgomery | M03 | 🔴 Yes |
| Montgomery City Permit Pages (montgomeryal.gov) | Permit application guides, required docs | M03 | 🟡 High |
| Glassdoor (Montgomery, AL) | Salary benchmarks by role | M07 | 🟢 Nice |

**Key insight:** Bright Data is NOT optional for CivicGuide. The city API has no benefit eligibility rules and no form guides. Bright Data scraping of government sites is the only way to get this data into the RAG layer.

---

## 🏆 The Event

| Field | Detail |
|-------|--------|
| **Event** | World Wide Vibes Hackathon (WWV Mar 2026) |
| **Organizer** | GenAI.Works Academy + Hackmakers (acquired May 2025) |
| **Format** | Fully virtual, globally open, FREE |
| **Kickoff** | March 5, 2026 @ 9:00 AM Central |
| **Team Reg Deadline** | March 7, 2026 |
| **Submission Deadline** | March 9, 2026 |
| **Prize Pool** | $5,000 across 4 placements (confirmed credible) |
| **Bonus Points** | Using Bright Data tools in solution |
| **Submission Required** | Working prototype + short demo/presentation |
| **Links** | [Main Page](https://academy.genai.works/hackathon) · [Tracks](https://academy.genai.works/hackathon#tracks) · [Registration](https://academy.genai.works/account/live-courses/world-wide-vibes-hackathon) |

---

## 🏢 The Organizer — GenAI.Works (Key Context)

| Signal | Reality |
|--------|---------|
| **What they claim** | World's largest AI community, 12M users, $225M valuation |
| **What they are** | AI media + community + beginner education company |
| **Tech level** | Beginner-to-intermediate (Vibe Coding, Google AI Studio, Bright Data) |
| **Hackathon audience** | Non-coders, beginners, students — explicitly no coding experience required |
| **Implication for us** | Our hybrid ML + Agentic solution is far above the median competitor. Low bar → high ceiling. |
| **CEO** | Steve Nouri — AI evangelist, ex-Head of DS/AI @ Australian Computer Society |
| **Revenue** | $982K audited (2024) — $5K prize is fully credible |
| **Key sponsor tool** | Bright Data (bonus points for usage — must document explicitly) |

---

## 🗂️ Track Verdicts (Final)

| Track | Verdict | Persona | Core Problem |
|-------|---------|---------|-------------|
| 🏛️ **Civic Access** | ✅ STRONG GO | Dorothy, 58F | Benefits Maze — 15,578 lost Medicaid in 12 months |
| 📈 **Workforce Growth** | ✅ STRONG GO | Marcus, 34M | Wage Trap — 2.9% unemployment + 19.7% poverty = underemployment |
| 🏙️ Smart Cities | ⚠️ Pass | — | High competition, sparse sensor data |
| 🛡️ Public Safety | ⚠️ Pass | — | Ethical complexity, bias scrutiny |

---

## 🔑 Quick Reference

| Term | Meaning |
|------|---------|
| **WWV** | World Wide Vibes Hackathon |
| **MontgomeryAI** | Platform name — dual-agent civic + workforce intelligence system |
| **CivicGuide MGM** | Civic Access agent — helps Dorothy claim benefits + navigate city services |
| **CareerPath MGM** | Workforce Growth agent — helps Marcus close skill gap + find higher-wage jobs |
| **EHI** | Economic Health Index — K-Means composite score model (neighbourhood-level) |
| **Skill Gap Extractor** | NLP pipeline: Bright Data job scrape → spaCy NER → O*NET matching |
| **Benefits Maze** | Core civic problem: people lose entitlements due to navigation failure, not ineligibility |
| **Wage Trap** | Core workforce problem: low unemployment + high poverty = people employed in wrong jobs |
| **ACS** | American Community Survey (U.S. Census) — demographic backbone |
| **BLS LAUS** | Bureau of Labor Statistics Local Area Unemployment Statistics |
| **O*NET** | Occupational Information Network — 30K+ occupation skill taxonomy |
| **DHR** | Alabama Department of Human Resources — SNAP, TANF, childcare programs |
| **Vibe Coding** | What average WWV participants use — our bar is much higher |
| **M00–M10** | Module numbering convention — see modules/README.md |

---

## 📌 Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 3 | Researched 4 hackathon tracks | WWV_Hackathon_Brief.docx |
| Mar 3 | Mapped Montgomery open data to civic + workforce tracks | Montgomery_Data_Architecture_Brief.docx |
| Mar 3 | Deep-dived GenAI.Works — confirmed low-bar event | GenAI_Works_Company_Intelligence.docx |
| Mar 3 | Defined Phase 2 mandate | This file |
| Mar 4 | Workforce Growth Phase 2 COMPLETE | Persona "Marcus". Verdict: STRONG GO. Wage trap confirmed. |
| Mar 4 | Civic Access Phase 2 COMPLETE | Persona "Dorothy". Verdict: STRONG GO. Benefits Maze confirmed. |
| Mar 4 | Phase 2 COMPLETE — BOTH tracks GO | Recommended dual-platform MontgomeryAI |
| Mar 4 | **COMMITTED: Build dual-platform MontgomeryAI** | Both tracks, shared infra, 5-day sprint |
| Mar 4 | Confirmed 2-pillar data architecture | Pillar 1: ArcGIS city API. Pillar 2: Bright Data scraping. External APIs (Census/BLS/O*NET) = context layer. |
| Mar 4 | Identified civic access data gap | City API has NO entitlement rules, NO form guides. Bright Data CRITICAL for CivicGuide, not optional. |
| Mar 4 | Phase 3 modular decomposition COMPLETE | 11 modules (M00–M10) defined. PLAN.md per module. Build sprint ready. |
| Mar 4 | Produced product + feasibility docs | MontgomeryAI_Product_Overview_Brief.docx + MontgomeryAI_Technical_Feasibility_Data_Catalog.docx |

---

*Phase 3 active. Next: build from M00 upward. Shared modules first, then CivicGuide, then CareerPath, then frontend.*
