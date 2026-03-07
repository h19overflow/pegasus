import yellowhammer from "@/assets/yellowhammer.png";
import { useApp } from "@/lib/appContext";
import type { ProcessingStep } from "@/lib/types";

const StepIcon = ({ status }: { status: ProcessingStep["status"] }) => {
  if (status === "completed") {
    return <span className="text-green-500 text-xs font-bold">✓</span>;
  }
  if (status === "in_progress") {
    return (
      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    );
  }
  return <div className="w-3 h-3 border border-muted-foreground/30 rounded-full" />;
};

const DetailedSteps = ({ steps }: { steps: ProcessingStep[] }) => (
  <div className="flex gap-2 px-4 py-1.5">
    <img src={yellowhammer} alt="AI" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
    <div className="bg-white rounded-2xl rounded-tl-md p-4 border border-secondary/10 shadow-sm space-y-2">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-2">
          <StepIcon status={step.status} />
          <span
            className={`text-sm ${step.status === "completed" ? "text-muted-foreground" : "text-foreground"}`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const BouncingDots = () => (
  <div className="flex gap-2 px-4 py-1.5">
    <img src={yellowhammer} alt="AI" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
    <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 border border-secondary/10 shadow-sm flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  </div>
);

const ProcessingIndicator = () => {
  const { state } = useApp();
  const { isTyping, processingSteps } = state;

  if (!isTyping) return null;
  if (processingSteps.length > 0) return <DetailedSteps steps={processingSteps} />;
  return <BouncingDots />;
};

export default ProcessingIndicator;
