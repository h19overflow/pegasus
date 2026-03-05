import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { matchJobsToProfile, computeTrendingSkills } from "@/lib/jobMatcher";
import { fetchJobListings } from "@/lib/jobService";
import type { JobMatch } from "@/lib/types";
import JobMatchCard from "./JobMatchCard";
import TrendingSkillsBar from "./TrendingSkillsBar";
import MarketPulse, { extractTitleKeyword } from "./MarketPulse";
import JobFilters, {
  createDefaultFilters,
  countActiveFilters,
  type JobFilterState,
} from "./JobFilters";

const SOURCE_FILTERS = ["All", "Indeed", "LinkedIn"] as const;

function parseSalaryMinimum(salary: string): number {
  const match = salary.match(/\$?([\d,.]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, ""));
}

const JobMatchPanel = () => {
  const { state, dispatch } = useApp();
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<JobFilterState>(createDefaultFilters);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hasCv = !!state.cvData;

  const scrollToResults = useCallback(() => {
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  // Load live scraped jobs on mount
  useEffect(() => {
    if (state.jobListings.length > 0) return;
    dispatch({ type: "SET_JOBS_LOADING", loading: true });
    fetchJobListings().then((listings) => {
      dispatch({ type: "SET_JOB_LISTINGS", listings });
      dispatch({ type: "SET_TRENDING_SKILLS", skills: computeTrendingSkills(listings) });
      dispatch({ type: "SET_JOBS_LOADING", loading: false });
    });
  }, []);

  // Recompute matches when CV changes
  useEffect(() => {
    if (!state.cvData || state.jobListings.length === 0) {
      dispatch({ type: "SET_JOB_MATCHES", matches: [] });
      return;
    }
    dispatch({ type: "SET_JOB_MATCHES", matches: matchJobsToProfile(state.jobListings, state.cvData) });
  }, [state.cvData, state.jobListings]);

  // Unique industries for filter dropdown
  const industries = useMemo(() => {
    const set = new Set(state.jobListings.map((j) => j.industry).filter(Boolean));
    return [...set].sort();
  }, [state.jobListings]);

  // Build display list with all filters + sorting
  const displayJobs: JobMatch[] = useMemo(() => {
    const base = hasCv
      ? state.jobMatches
      : state.jobListings.map((j) => ({
          ...j, matchPercent: 0, matchedSkills: [] as string[], missingSkills: [] as string[],
        }));

    const filtered = base.filter((job) => {
      if (sourceFilter !== "All" && job.source.toLowerCase() !== sourceFilter.toLowerCase()) return false;
      if (filters.jobTypes.size > 0 && !filters.jobTypes.has(job.jobType)) return false;
      if (filters.seniority.size > 0 && !filters.seniority.has(job.seniority)) return false;
      if (filters.industry && job.industry !== filters.industry) return false;
      if (filters.titleKeyword && extractTitleKeyword(job.title) !== filters.titleKeyword) return false;
      if (filters.skill && !job.skillSummary.toLowerCase().includes(filters.skill.toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.skillSummary.toLowerCase().includes(q);
      }
      return true;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      if (filters.sortBy === "recent") return new Date(b.posted).getTime() - new Date(a.posted).getTime();
      if (filters.sortBy === "match") return b.matchPercent - a.matchPercent;
      if (filters.sortBy === "salary") return parseSalaryMinimum(b.salary) - parseSalaryMinimum(a.salary);
      return 0;
    });
  }, [hasCv, state.jobMatches, state.jobListings, sourceFilter, searchQuery, filters]);

  const matchedCount = state.jobMatches.filter((m) => m.matchPercent >= 40).length;
  const activeFilterCount = countActiveFilters(filters);

  if (state.jobsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading Montgomery job market data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Montgomery Job Market</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasCv ? `${matchedCount} jobs match your profile (40%+)` : "Live data from Indeed & LinkedIn"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-pine-green animate-pulse" />
          Updated daily
        </div>
      </div>

      {/* Search + source filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs, skills, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex rounded-lg border border-border/50 overflow-hidden">
          {SOURCE_FILTERS.map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                sourceFilter === src ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {state.jobListings.length > 0 && (
        <MarketPulse
          jobs={state.jobListings}
          activeIndustry={filters.industry}
          activeRole={filters.titleKeyword}
          onFilterByIndustry={(industry) => { setFilters((prev) => ({ ...prev, industry })); if (industry) scrollToResults(); }}
          onFilterByRole={(role) => { setFilters((prev) => ({ ...prev, titleKeyword: role })); if (role) scrollToResults(); }}
          onFilterBySeniority={(level) => {
            setFilters((prev) => {
              const next = new Set(prev.seniority);
              if (next.has(level)) next.delete(level);
              else { next.clear(); next.add(level); }
              return { ...prev, seniority: next };
            });
            scrollToResults();
          }}
        />
      )}
      {state.trendingSkills.length > 0 && (
        <TrendingSkillsBar
          skills={state.trendingSkills}
          activeSkill={filters.skill}
          onFilterBySkill={(skill) => { setFilters((prev) => ({ ...prev, skill })); if (skill) scrollToResults(); }}
        />
      )}

      {/* Sort + Filters */}
      <JobFilters
        filters={filters}
        onFiltersChange={setFilters}
        industries={industries}
        showMatchSort={hasCv}
        activeFilterCount={activeFilterCount}
      />

      {/* Results header */}
      <div ref={resultsRef} className="flex items-center justify-between scroll-mt-4">
        <h3 className="text-sm font-semibold text-foreground">
          {hasCv ? "Jobs Ranked by Your Skill Match" : "All Montgomery Jobs"}
        </h3>
        <span className="text-xs text-muted-foreground">{displayJobs.length} results</span>
      </div>

      <div className="space-y-3">
        {displayJobs.map((job) => (
          <JobMatchCard
            key={job.id}
            job={job}
            showMatch={hasCv}
            isExpanded={expandedJobId === job.id}
            onToggleExpand={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
          />
        ))}
      </div>

      {displayJobs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No jobs match your filters</p>
        </div>
      )}
    </div>
  );
};

export default JobMatchPanel;
