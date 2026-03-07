import { Briefcase, Building2, GraduationCap, Users } from "lucide-react";
import type { JobListing } from "@/lib/types";

interface MarketPulseProps {
  jobs: JobListing[];
  activeIndustry?: string;
  activeRole?: string;
  onFilterByIndustry?: (industry: string) => void;
  onFilterByRole?: (role: string) => void;
  onFilterBySeniority?: (level: string) => void;
}

// ── Pure computation helpers ────────────────────────────────

function countByField<T extends object>(
  items: T[],
  extractKey: (item: T) => string
): Record<string, number> {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = extractKey(item);
    if (key) accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function computeTopSector(jobs: JobListing[]): { name: string; count: number } {
  const counts = countByField(jobs, (job) => job.industry);
  const [name, count] = Object.entries(counts).sort(([, a], [, b]) => b - a)[0] ?? ["—", 0];
  return { name, count };
}

function computeEntryLevelPercent(jobs: JobListing[]): number {
  if (jobs.length === 0) return 0;
  const entryCount = jobs.filter((job) => job.seniority === "Entry level").length;
  return Math.round((entryCount / jobs.length) * 100);
}

function computeAverageApplicants(jobs: JobListing[]): number {
  const jobsWithApplicants = jobs.filter((job) => typeof job.applicants === "number");
  if (jobsWithApplicants.length === 0) return 0;
  const total = jobsWithApplicants.reduce((sum, job) => sum + (job.applicants ?? 0), 0);
  return Math.round(total / jobsWithApplicants.length);
}

function computeTopSixByCount(counts: Record<string, number>): Array<{ name: string; count: number }> {
  return Object.entries(counts)
    .filter(([name]) => name.trim() !== "")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
}

export function extractTitleKeyword(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("nurse") || lowerTitle.includes("nursing")) return "Nurse";
  if (lowerTitle.includes("associate")) return "Associate";
  if (lowerTitle.includes("manager")) return "Manager";
  if (lowerTitle.includes("technician") || lowerTitle.includes("tech")) return "Technician";
  if (lowerTitle.includes("assistant")) return "Assistant";
  if (lowerTitle.includes("driver")) return "Driver";
  if (lowerTitle.includes("sales")) return "Sales";
  if (lowerTitle.includes("analyst")) return "Analyst";
  if (lowerTitle.includes("engineer")) return "Engineer";
  if (lowerTitle.includes("coordinator")) return "Coordinator";
  // Fall back to the first meaningful word
  return title.split(/\s+/)[0] ?? title;
}

// ── Sub-components ──────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  iconBackground: string;
  label: string;
  value: string;
  detail: string;
  onClick?: () => void;
  isActive?: boolean;
}

function MetricCard({ icon, iconBackground, label, value, detail, onClick, isActive }: MetricCardProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-xl border bg-white p-3 flex items-start gap-3 text-left transition-all ${
        isActive
          ? "border-primary/40 ring-2 ring-primary/10 shadow-sm"
          : "border-border/50"
      } ${onClick ? "cursor-pointer hover:shadow-sm hover:border-primary/20" : ""}`}
    >
      <div className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${iconBackground}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{detail}</p>
      </div>
    </Wrapper>
  );
}

interface HorizontalBarRowProps {
  name: string;
  count: number;
  maxCount: number;
  barColor: string;
  activeColor?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function HorizontalBarRow({ name, count, maxCount, barColor, activeColor, isActive, onClick }: HorizontalBarRowProps) {
  const widthPercent = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  const bar = isActive ? (activeColor ?? "bg-primary") : barColor;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left rounded-md px-1 -mx-1 py-0.5 transition-colors ${
        isActive ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={`text-xs w-28 shrink-0 truncate ${isActive ? "font-bold text-foreground" : "text-muted-foreground font-medium"}`}>
        {name}
      </span>
      <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-colors ${bar}`} style={{ width: `${widthPercent}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-4 text-right shrink-0">{count}</span>
    </button>
  );
}

// ── Main component ──────────────────────────────────────────

const MarketPulse = ({ jobs, activeIndustry, activeRole, onFilterByIndustry, onFilterByRole, onFilterBySeniority }: MarketPulseProps) => {
  const topSector = computeTopSector(jobs);
  const entryLevelPercent = computeEntryLevelPercent(jobs);
  const averageApplicants = computeAverageApplicants(jobs);

  const industryCounts = countByField(jobs, (job) => job.industry);
  const topIndustries = computeTopSixByCount(industryCounts);

  const titleKeywordCounts = countByField(jobs, (job) => extractTitleKeyword(job.title));
  const topTitleKeywords = computeTopSixByCount(titleKeywordCounts);

  const maxIndustryCount = topIndustries[0]?.count ?? 1;
  const maxTitleCount = topTitleKeywords[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {/* Row 1: Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          icon={<Briefcase className="w-3.5 h-3.5 text-teal-700" />}
          iconBackground="bg-teal-50"
          label="Active Jobs"
          value={String(jobs.length)}
          detail="From Indeed & LinkedIn"
        />
        <MetricCard
          icon={<Building2 className="w-3.5 h-3.5 text-violet-700" />}
          iconBackground="bg-violet-50"
          label="Top Sector"
          value={topSector.name}
          detail={`${topSector.count} open positions — click to filter`}
          onClick={() => onFilterByIndustry?.(activeIndustry === topSector.name ? "" : topSector.name)}
          isActive={activeIndustry === topSector.name}
        />
        <MetricCard
          icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-700" />}
          iconBackground="bg-emerald-50"
          label="Entry Level"
          value={`${entryLevelPercent}%`}
          detail="Click to show entry-level jobs"
          onClick={() => onFilterBySeniority?.("Entry level")}
        />
        <MetricCard
          icon={<Users className="w-3.5 h-3.5 text-amber-700" />}
          iconBackground="bg-amber-50"
          label="Avg Competition"
          value={String(averageApplicants)}
          detail="applicants per listing"
        />
      </div>

      {/* Row 2: Bar chart pair */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Hiring by Industry
            <span className="text-[10px] font-normal text-muted-foreground ml-1.5">click to filter</span>
          </p>
          <div className="space-y-0.5">
            {topIndustries.map(({ name, count }) => (
              <HorizontalBarRow
                key={name}
                name={name}
                count={count}
                maxCount={maxIndustryCount}
                barColor="bg-teal-500"
                activeColor="bg-teal-600"
                isActive={activeIndustry === name}
                onClick={() => onFilterByIndustry?.(activeIndustry === name ? "" : name)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            In-Demand Roles
            <span className="text-[10px] font-normal text-muted-foreground ml-1.5">click to filter</span>
          </p>
          <div className="space-y-0.5">
            {topTitleKeywords.map(({ name, count }) => (
              <HorizontalBarRow
                key={name}
                name={name}
                count={count}
                maxCount={maxTitleCount}
                barColor="bg-amber-400"
                activeColor="bg-amber-500"
                isActive={activeRole === name}
                onClick={() => onFilterByRole?.(activeRole === name ? "" : name)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPulse;
