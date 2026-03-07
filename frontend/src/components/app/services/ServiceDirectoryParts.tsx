import { ArrowRight, Compass, Map, Search } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";
import { SITUATION_CARDS, type CategoryCardConfig } from "./serviceCategories";

export function DirectoryHero({ onShowMap }: { onShowMap: () => void }) {
  return (
    <div className="px-8 pt-8 pb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">City Services</h1>
          <p className="text-sm text-muted-foreground">Montgomery, Alabama</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3 max-w-lg leading-relaxed">
        Find and access public services across Montgomery County. Each service
        includes step-by-step guides, eligibility details, and locations on the map.
      </p>
      <button
        onClick={onShowMap}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-white text-sm font-medium text-foreground hover:shadow-md transition-all"
      >
        <Map className="w-4 h-4 text-primary" />
        View all on map
      </button>
    </div>
  );
}

export function DirectorySearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search services or locations..."
        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border/50 bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
      />
    </div>
  );
}

export function SituationCards({
  onSelectCategory,
}: {
  onSelectCategory: (c: ServiceCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SITUATION_CARDS.map((card) => (
        <button
          key={card.category}
          onClick={() => onSelectCategory(card.category)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/40 bg-white text-sm text-foreground hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm transition-all"
        >
          <span>{card.emoji}</span>
          <span>{card.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CategoryCard({
  config,
  locationCount,
  onSelect,
}: {
  config: CategoryCardConfig;
  locationCount: number;
  onSelect: () => void;
}) {
  const { icon: Icon, label, description, color, bgLight } = config;
  return (
    <button
      onClick={onSelect}
      className={`rounded-2xl border p-6 text-left transition-all hover:shadow-md group ${bgLight}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {locationCount > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {locationCount} location{locationCount !== 1 ? "s" : ""} in Montgomery
        </p>
      )}
    </button>
  );
}

export function HelpPromptCard({
  onNavigateToChat,
}: {
  onNavigateToChat: (msg: string) => void;
}) {
  return (
    <button
      onClick={() => onNavigateToChat("I need help finding the right services for my situation")}
      className="w-full rounded-2xl border border-border/50 bg-white p-6 text-left hover:shadow-md transition-shadow group"
    >
      <p className="text-sm font-semibold text-foreground mb-1">Not sure where to start?</p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Tell us about your situation and we'll guide you to the right services,
        help with eligibility, and walk you through every step.
      </p>
      <div className="flex items-center gap-1.5 mt-3 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
        Talk to a guide
        <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}
