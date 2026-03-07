import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Loader2,
  Map,
  MapPin,
  Phone,
} from "lucide-react";
import type { ServiceGuide } from "@/lib/govServices";
import { useApp } from "@/lib/appContext";
import type { PersonalizedRoadmap } from "@/lib/types";

export function GuideExpandedContent({
  guide,
  onNavigateToChat,
}: {
  guide: ServiceGuide;
  onNavigateToChat: (msg: string) => void;
}) {
  const { state, dispatch } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleBuildRoadmap() {
    setIsGenerating(true);

    try {
      const body: Record<string, unknown> = { serviceId: guide.id };
      if (state.citizenMeta) {
        body.citizen = state.citizenMeta;
      }

      const response = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail ?? `HTTP ${response.status}`);
      }

      const roadmap = (await response.json()) as PersonalizedRoadmap;
      dispatch({ type: "SET_ACTIVE_ROADMAP", roadmap });
    } catch (error) {
      console.error("[GuideExpandedContent] Failed to generate roadmap", error);
      onNavigateToChat(
        `Help me apply for ${guide.title}. I want to check eligibility and understand the steps.`,
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="px-3 pb-3 space-y-3 border-t border-border/20 pt-2.5">
      <p className="text-xs text-muted-foreground leading-relaxed">{guide.description}</p>

      {guide.eligibility.length > 0 && (
        <GuideSection title="Who's Eligible" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}>
          {guide.eligibility.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed">{item}</li>
          ))}
        </GuideSection>
      )}

      {guide.howToApply.length > 0 && (
        <GuideSection title="How to Apply" icon={<ClipboardList className="w-3.5 h-3.5 text-blue-600" />}>
          {guide.howToApply.map((step, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground mr-1">{i + 1}.</span>
              {step}
            </li>
          ))}
        </GuideSection>
      )}

      {guide.documentsNeeded.length > 0 && (
        <GuideSection title="Documents Needed" icon={<FileText className="w-3.5 h-3.5 text-amber-600" />}>
          {guide.documentsNeeded.map((doc, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed">{doc}</li>
          ))}
        </GuideSection>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {guide.phone && (
          <a href={`tel:${guide.phone}`} className="flex items-center gap-1 hover:text-foreground">
            <Phone className="w-3 h-3" /> {guide.phone}
          </a>
        )}
        {guide.address && guide.address !== "N/A — phone and web service" && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {guide.address}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <a
          href={guide.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/50 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Visit Website
        </a>
        <button
          onClick={handleBuildRoadmap}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Building...
            </>
          ) : (
            <>
              <Map className="w-3.5 h-3.5" />
              Details &rarr;
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function GuideSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <ul className="space-y-1 pl-1">{children}</ul>
    </div>
  );
}
