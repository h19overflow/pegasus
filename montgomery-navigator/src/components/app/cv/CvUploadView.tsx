import { useState } from "react";
import {
  Briefcase,
  TrendingUp,
  Target,
  CheckCircle,
  Sparkles,
  MapPin,
  GraduationCap,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import JobMatchPanel from "./JobMatchPanel";
import UpskillingPanel from "./UpskillingPanel";
import CommutePanel from "./CommutePanel";
import CitizenProfileBar from "./CitizenProfileBar";
import UploadZone from "./UploadZone";

type CareerTab = "market" | "growth";

const TABS: { id: CareerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "market", label: "Job Market", icon: Briefcase },
  { id: "growth", label: "Growth Plan", icon: TrendingUp },
];

const VALUE_PROPS = [
  { icon: Target, text: "Match scores for every job" },
  { icon: Sparkles, text: "Personalized skill gap analysis" },
  { icon: GraduationCap, text: "Training programs near you" },
  { icon: MapPin, text: "Commute time estimates" },
];

function OnboardingHero() {
  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-secondary/5 p-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: value proposition */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Unlock Your Career Match</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Upload your resume and we'll match you against every job in Montgomery,
            show your skill gaps, and recommend training programs.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-pine-green shrink-0" />
                <span className="text-xs text-foreground font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: upload zone */}
        <div className="w-full md:w-[280px] shrink-0">
          <UploadZone compact />
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-foreground">Career Growth</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Montgomery's job market + your personal career path
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-pine-green animate-pulse" />
        Updated daily
      </div>
    </div>
  );
}

const CvUploadView = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<CareerTab>("market");
  const hasCv = !!state.cvData;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Profile bar — only when CV is loaded */}
      {hasCv && <CitizenProfileBar />}

      {/* Tab bar — only when CV is loaded */}
      {hasCv && (
        <div className="flex border-b border-border/50 bg-white shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasCv && (
          <div className="space-y-5 p-5 pb-8">
            <PageHeader />
            <OnboardingHero />
            <JobMatchPanel />
          </div>
        )}

        {hasCv && activeTab === "market" && (
          <div className="space-y-0">
            <div className="px-5 pt-4 pb-0">
              <PageHeader />
            </div>
            <JobMatchPanel />
          </div>
        )}

        {hasCv && activeTab === "growth" && (
          <div className="flex flex-col h-full">
            <UpskillingPanel />
            <CommutePanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default CvUploadView;
