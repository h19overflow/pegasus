import { useEffect } from "react";
import {
  TrendingUp,
  Zap,
  Clock,
  BookOpen,
  ArrowUpRight,
  GraduationCap,
  Target,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import { computeUpskillingSummary } from "@/lib/upskillingEngine";
import type { UpskillPath } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-blue-500",
  healthcare: "bg-red-500",
  soft_skills: "bg-emerald-500",
  education: "bg-purple-500",
};

const UpskillingPanel = () => {
  const { state, dispatch } = useApp();

  // Recompute upskilling when CV or matches change
  useEffect(() => {
    if (!state.cvData || state.jobMatches.length === 0) {
      dispatch({ type: "SET_UPSKILLING_SUMMARY", summary: null });
      return;
    }
    const summary = computeUpskillingSummary(
      state.cvData,
      state.jobMatches,
      state.trendingSkills,
    );
    dispatch({ type: "SET_UPSKILLING_SUMMARY", summary });
  }, [state.cvData, state.jobMatches, state.trendingSkills]);

  const summary = state.upskillingSummary;
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Loading upskilling analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-8">
      {/* Impact overview */}
      <ImpactHeader
        currentRate={summary.currentMatchRate}
        projectedRate={summary.projectedMatchRate}
        topPathCount={Math.min(summary.topPaths.length, 3)}
      />

      {/* Quick wins */}
      {summary.quickWins.length > 0 && (
        <QuickWinsSection paths={summary.quickWins} />
      )}

      {/* Top upskilling paths */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          Highest-Impact Skills to Learn
        </h3>
        <div className="space-y-3">
          {summary.topPaths.map((path) => (
            <SkillPathCard key={path.skillName} path={path} />
          ))}
        </div>
      </div>
    </div>
  );
};

function ImpactHeader({
  currentRate,
  projectedRate,
  topPathCount,
}: {
  currentRate: number;
  projectedRate: number;
  topPathCount: number;
}) {
  const improvement = projectedRate - currentRate;

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
      <h2 className="text-base font-bold text-foreground mb-1">Your Upskilling Path</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Learning {topPathCount} key skills could significantly improve your job market position
      </p>
      <div className="grid grid-cols-3 gap-3">
        <MetricBox
          label="Current Match Rate"
          value={`${currentRate}%`}
          sublabel="of jobs match 40%+"
        />
        <MetricBox
          label="Projected Rate"
          value={`${projectedRate}%`}
          sublabel={`after top ${topPathCount} skills`}
          highlight
        />
        <MetricBox
          label="Improvement"
          value={`+${improvement}%`}
          sublabel="more job matches"
          highlight={improvement > 0}
        />
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-pine-green" : "text-foreground"}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function QuickWinsSection({ paths }: { paths: UpskillPath[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-500" />
        Quick Wins (2 weeks or less)
      </h3>
      <div className="flex flex-wrap gap-2">
        {paths.map((path) => (
          <div
            key={path.skillName}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-amber-200"
          >
            <span className="text-xs font-medium text-amber-900">{path.skillName}</span>
            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {path.estimatedWeeks}w
            </span>
            {path.trainingOptions.some((t) => t.cost === "free") && (
              <span className="text-[9px] font-bold text-pine-green bg-pine-green/10 px-1.5 py-0.5 rounded">
                FREE
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillPathCard({ path }: { path: UpskillPath }) {
  const color = CATEGORY_COLORS[path.category] ?? "bg-primary";

  return (
    <div className="rounded-xl border border-border/50 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <h4 className="text-sm font-bold text-foreground">{path.skillName}</h4>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {path.demandPercent > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {path.demandPercent}% demand
            </span>
          )}
          <span className="flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-pine-green" />
            +{path.jobsUnlocked} jobs
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Est. {formatDuration(path.estimatedWeeks)}
        </span>
      </div>

      {/* Training options */}
      {path.trainingOptions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            Where to learn
          </p>
          <div className="space-y-1.5">
            {path.trainingOptions.map((option) => (
              <div
                key={option.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{option.name}</p>
                  <p className="text-[10px] text-muted-foreground">{option.provider}</p>
                </div>
                <div className="flex items-center gap-2">
                  <FormatBadge label={option.format} />
                  <CostBadge cost={option.cost} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {path.trainingOptions.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
          <BookOpen className="w-3 h-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Search for local training programs in Montgomery
          </p>
        </div>
      )}
    </div>
  );
}

function FormatBadge({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted/50 text-muted-foreground capitalize">
      {label}
    </span>
  );
}

function CostBadge({ cost }: { cost: string }) {
  const colors: Record<string, string> = {
    free: "text-pine-green bg-pine-green/10",
    low: "text-amber-700 bg-amber-100",
    moderate: "text-orange-700 bg-orange-100",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[cost] ?? ""}`}>
      {cost}
    </span>
  );
}

function formatDuration(weeks: number): string {
  if (weeks <= 1) return "~1 week";
  if (weeks < 4) return `~${weeks} weeks`;
  if (weeks < 8) return `~${Math.round(weeks / 4)} month`;
  return `~${Math.round(weeks / 4)} months`;
}

export default UpskillingPanel;
