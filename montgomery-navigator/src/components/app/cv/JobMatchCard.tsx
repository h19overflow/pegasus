import { useState } from "react";
import {
  Briefcase,
  MapPin,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  DollarSign,
  Building2,
  Star,
} from "lucide-react";
import type { JobMatch } from "@/lib/types";

interface JobMatchCardProps {
  job: JobMatch;
  showMatch?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function matchColor(percent: number): string {
  if (percent >= 70) return "text-pine-green bg-pine-green/10 border-pine-green/30";
  if (percent >= 40) return "text-amber-gold bg-amber-gold/10 border-amber-gold/30";
  return "text-muted-foreground bg-muted/50 border-border";
}

const SOURCE_ICONS: Record<string, string> = {
  indeed: "🔵",
  linkedin: "🟦",
};

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const JobMatchCard = ({ job, showMatch = false, isExpanded = false, onToggleExpand }: JobMatchCardProps) => {
  const posted = formatTimeAgo(job.posted);
  const [showTooltip, setShowTooltip] = useState(false);

  const topSkills = job.skillSummary ? job.skillSummary.split(", ").slice(0, 3) : [];

  return (
    <div
      className={`rounded-xl border bg-white transition-all relative ${
        isExpanded ? "border-primary/30 shadow-md" : "border-border/50 hover:shadow-md"
      }`}
      onMouseEnter={() => { if (!isExpanded) setShowTooltip(true); }}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Hover tooltip — quick preview */}
      {showTooltip && !isExpanded && topSkills.length > 0 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
          <div className="bg-foreground text-white rounded-lg px-3 py-2 text-[10px] shadow-lg max-w-56">
            <div className="flex items-center gap-2 mb-1">
              {job.salary && <span className="font-bold">{job.salary}</span>}
              {showMatch && <span className="font-bold">{job.matchPercent}% match</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {topSkills.map((s) => (
                <span key={s} className="px-1.5 py-0.5 bg-white/20 rounded text-[9px]">{s}</span>
              ))}
            </div>
          </div>
          <div className="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
        </div>
      )}

      {/* Clickable header area */}
      <button
        onClick={() => { setShowTooltip(false); onToggleExpand?.(); }}
        className="w-full text-left p-4 pb-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm">
              {SOURCE_ICONS[job.source] ?? <Briefcase className="w-4 h-4 text-primary" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-foreground leading-tight">{job.title}</h4>
              <p className="text-xs text-muted-foreground">{job.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showMatch && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${matchColor(job.matchPercent)}`}>
                {job.matchPercent}%
              </span>
            )}
            {isExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </div>
        </div>

        {/* Meta row — always visible */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
          {job.salary && <span className="font-semibold text-foreground">{job.salary}</span>}
          {job.jobType && <span className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px]">{job.jobType}</span>}
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.address || "Montgomery, AL"}
          </span>
          {posted && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {posted}
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail section */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
          {/* Quick info grid */}
          <div className="grid grid-cols-2 gap-2">
            {job.industry && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3 shrink-0" />
                <span>{job.industry}</span>
              </div>
            )}
            {job.seniority && job.seniority !== "Not Applicable" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star className="w-3 h-3 shrink-0" />
                <span>{job.seniority}</span>
              </div>
            )}
            {job.salary && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3 shrink-0" />
                <span>{job.salary}</span>
              </div>
            )}
            {typeof job.applicants === "number" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3 shrink-0" />
                <span>{job.applicants} applicants</span>
              </div>
            )}
          </div>

          {/* Key skills */}
          {!showMatch && job.skillSummary && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Required Skills</p>
              <div className="flex flex-wrap gap-1">
                {job.skillSummary.split(", ").slice(0, 8).map((skill) => (
                  <span key={skill} className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-medium border border-secondary/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched skills */}
          {showMatch && job.matchedSkills.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-pine-green mb-1.5">Your matching skills</p>
              <div className="flex flex-wrap gap-1">
                {job.matchedSkills.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 rounded-full bg-pine-green/10 text-pine-green text-[10px] font-medium">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing skills */}
          {showMatch && job.missingSkills.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">Skills to develop</p>
              <div className="flex flex-wrap gap-1">
                {job.missingSkills.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 rounded-full border border-primary/30 text-primary text-[10px] font-medium">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Benefits</p>
              <div className="flex flex-wrap gap-1">
                {job.benefits.map((benefit) => (
                  <span key={benefit} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <a
              href={job.applyLink || job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
            >
              Apply Now
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 border border-border rounded-lg py-2.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
            >
              Full Details
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMatchCard;
