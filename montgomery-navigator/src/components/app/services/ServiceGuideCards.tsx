import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  ClipboardList,
  Heart,
  Baby,
  GraduationCap,
  Home,
  Scale,
  Zap,
  UtensilsCrossed,
  HelpCircle,
} from "lucide-react";
import type { ServiceGuide } from "@/lib/govServices";

const CATEGORY_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
}> = {
  healthcare: { icon: Heart, color: "text-red-600", bgLight: "bg-red-50 border-red-100" },
  food: { icon: UtensilsCrossed, color: "text-orange-600", bgLight: "bg-orange-50 border-orange-100" },
  childcare: { icon: Baby, color: "text-amber-600", bgLight: "bg-amber-50 border-amber-100" },
  workforce: { icon: GraduationCap, color: "text-blue-600", bgLight: "bg-blue-50 border-blue-100" },
  housing: { icon: Home, color: "text-emerald-600", bgLight: "bg-emerald-50 border-emerald-100" },
  utilities: { icon: Zap, color: "text-yellow-600", bgLight: "bg-yellow-50 border-yellow-100" },
  legal: { icon: Scale, color: "text-purple-600", bgLight: "bg-purple-50 border-purple-100" },
  benefits: { icon: HelpCircle, color: "text-teal-600", bgLight: "bg-teal-50 border-teal-100" },
};

interface ServiceGuideCardsProps {
  guides: ServiceGuide[];
  onNavigateToChat: (message: string) => void;
}

export default function ServiceGuideCards({ guides, onNavigateToChat }: ServiceGuideCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (guides.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Service Guides</h3>
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          {guides.length} programs
        </span>
      </div>
      <p className="text-xs text-muted-foreground px-1">
        Eligibility details, step-by-step applications, and required documents for Montgomery services.
      </p>
      {guides.map((guide) => (
        <GuideCard
          key={guide.id}
          guide={guide}
          isExpanded={expandedId === guide.id}
          onToggle={() => setExpandedId(expandedId === guide.id ? null : guide.id)}
          onNavigateToChat={onNavigateToChat}
        />
      ))}
    </div>
  );
}

function GuideCard({
  guide,
  isExpanded,
  onToggle,
  onNavigateToChat,
}: {
  guide: ServiceGuide;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateToChat: (msg: string) => void;
}) {
  const config = CATEGORY_CONFIG[guide.category] ?? CATEGORY_CONFIG.benefits;
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border transition-all ${
      isExpanded ? "border-primary/30 shadow-md" : `${config.bgLight} hover:shadow-sm`
    }`}>
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0 ${config.color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-foreground leading-tight">{guide.title}</h4>
              <p className="text-[11px] text-muted-foreground">{guide.provider}</p>
            </div>
          </div>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          }
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
          {guide.description}
        </p>
      </button>

      {isExpanded && (
        <GuideExpandedContent guide={guide} onNavigateToChat={onNavigateToChat} />
      )}
    </div>
  );
}

function GuideExpandedContent({
  guide,
  onNavigateToChat,
}: {
  guide: ServiceGuide;
  onNavigateToChat: (msg: string) => void;
}) {
  return (
    <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-3">
      {/* Eligibility */}
      {guide.eligibility.length > 0 && (
        <GuideSection title="Who's Eligible" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}>
          {guide.eligibility.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed">{item}</li>
          ))}
        </GuideSection>
      )}

      {/* How to Apply */}
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

      {/* Documents Needed */}
      {guide.documentsNeeded.length > 0 && (
        <GuideSection title="Documents Needed" icon={<FileText className="w-3.5 h-3.5 text-amber-600" />}>
          {guide.documentsNeeded.map((doc, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed">{doc}</li>
          ))}
        </GuideSection>
      )}

      {/* Contact info */}
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

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={guide.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/50 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Visit Website
        </a>
        <button
          onClick={() => onNavigateToChat(
            `Help me apply for ${guide.title}. I want to check eligibility and understand the steps.`
          )}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Help Me Apply
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
