import { X, MapPin, Clock, FileText, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { useApp } from "@/lib/appContext";
import type { RoadmapStep } from "@/lib/types";

export function ServiceRoadmapView() {
  const { state, dispatch } = useApp();
  const roadmap = state.activeRoadmap;
  if (!roadmap) return null;

  const completedSet = new Set(state.roadmapCompletedStepIds);

  function handleClose() {
    dispatch({ type: "CLEAR_ROADMAP" });
  }

  function toggleStep(stepId: string) {
    dispatch({ type: "TOGGLE_ROADMAP_STEP", stepId });
  }

  return (
    <div className="flex flex-col flex-1 bg-background overflow-hidden">
      <header className="shrink-0 px-4 py-3 border-b border-border/30 flex items-center justify-between gap-3">
        <h1 className="text-sm font-bold text-foreground truncate flex-1 min-w-0">
          {roadmap.serviceTitle}
        </h1>
        <button
          onClick={handleClose}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Close roadmap"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {roadmap.eligibilityNote && (
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
            {roadmap.eligibilityNote}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Total time: {roadmap.totalEstimatedTime}</span>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Your steps
          </p>
          <ul className="space-y-3">
            {roadmap.steps.map((step) => (
              <RoadmapStepCard
                key={step.id}
                step={step}
                completed={completedSet.has(step.id)}
                onToggle={() => toggleStep(step.id)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RoadmapStepCard({
  step,
  completed,
  onToggle,
}: {
  step: RoadmapStep;
  completed: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border border-border/40 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
        >
          {completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {step.stepNumber}. {step.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            {step.action}
          </p>
          {step.estimatedTime && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" /> {step.estimatedTime}
            </span>
          )}
        </div>
      </div>

      {step.documents.length > 0 && (
        <div className="pl-7 flex flex-wrap gap-1.5">
          {step.documents.map((doc, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5"
            >
              <FileText className="w-3 h-3" /> {doc}
            </span>
          ))}
        </div>
      )}

      {step.location && (
        <div className="pl-7 text-[10px] text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground">{step.location.name}</p>
          <p className="flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" /> {step.location.address}
          </p>
          {step.location.hours && <p>{step.location.hours}</p>}
          {step.location.phone && <p>{step.location.phone}</p>}
        </div>
      )}

      {step.proTip && (
        <p className="pl-7 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded p-2">
          {step.proTip}
        </p>
      )}

      {step.canDoOnline && step.onlineUrl && (
        <a
          href={step.onlineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pl-7 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> Do this online
        </a>
      )}
    </li>
  );
}
