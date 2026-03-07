import { useState } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  X,
} from "lucide-react";

export interface JobFilterState {
  sortBy: "recent" | "match" | "salary";
  jobTypes: Set<string>;
  seniority: Set<string>;
  industry: string;
  titleKeyword: string;
  skill: string;
}

interface JobFiltersProps {
  filters: JobFilterState;
  onFiltersChange: (filters: JobFilterState) => void;
  industries: string[];
  showMatchSort: boolean;
  activeFilterCount: number;
}

const JOB_TYPES = ["Full-time", "Part-time", "Contract"];
const SENIORITY_LEVELS = ["Entry level", "Mid-Senior level", "Director"];

export function createDefaultFilters(): JobFilterState {
  return {
    sortBy: "recent",
    jobTypes: new Set<string>(),
    seniority: new Set<string>(),
    industry: "",
    titleKeyword: "",
    skill: "",
  };
}

export function countActiveFilters(filters: JobFilterState): number {
  let count = 0;
  if (filters.jobTypes.size > 0) count++;
  if (filters.seniority.size > 0) count++;
  if (filters.industry) count++;
  if (filters.titleKeyword) count++;
  if (filters.skill) count++;
  return count;
}

export default function JobFilters({
  filters,
  onFiltersChange,
  industries,
  showMatchSort,
  activeFilterCount,
}: JobFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  function toggleJobType(type: string) {
    const next = new Set(filters.jobTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onFiltersChange({ ...filters, jobTypes: next });
  }

  function toggleSeniority(level: string) {
    const next = new Set(filters.seniority);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    onFiltersChange({ ...filters, seniority: next });
  }

  function clearAllFilters() {
    onFiltersChange(createDefaultFilters());
  }

  return (
    <div className="space-y-2">
      {/* Sort + expand toggle row */}
      <div className="flex items-center justify-between gap-2">
        {/* Sort buttons */}
        <div className="flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {(["recent", ...(showMatchSort ? ["match"] : []), "salary"] as const).map((key) => {
            const labels: Record<string, string> = {
              recent: "Most Recent",
              match: "Best Match",
              salary: "Salary",
            };
            return (
              <button
                key={key}
                onClick={() => onFiltersChange({ ...filters, sortBy: key as JobFilterState["sortBy"] })}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  filters.sortBy === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
            expanded || activeFilterCount > 0
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Active chart-filter chips */}
      {(filters.titleKeyword || filters.skill || filters.industry) && (
        <div className="flex flex-wrap gap-1.5">
          {filters.titleKeyword && (
            <button
              onClick={() => onFiltersChange({ ...filters, titleKeyword: "" })}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              Role: {filters.titleKeyword}
              <X className="w-3 h-3" />
            </button>
          )}
          {filters.skill && (
            <button
              onClick={() => onFiltersChange({ ...filters, skill: "" })}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              Skill: {filters.skill}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Expanded filter panel */}
      {expanded && (
        <div className="rounded-xl border border-border/50 bg-white p-3 space-y-3">
          {/* Job Type */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Job Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {JOB_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleJobType(type)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                    filters.jobTypes.has(type)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Seniority */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Experience Level
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SENIORITY_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleSeniority(level)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                    filters.seniority.has(level)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Industry
            </p>
            <select
              value={filters.industry}
              onChange={(e) => onFiltersChange({ ...filters, industry: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border/50 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
