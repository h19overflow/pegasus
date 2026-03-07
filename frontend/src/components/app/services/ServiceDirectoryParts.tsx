import { ArrowRight, MapPin, Search } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import { useEffect } from "react";
import { useApp } from "@/lib/appContext";
import { getMarkerColor } from "@/lib/mapMarkers";
import "@/lib/leafletSetup";
import type { ServiceCategory } from "@/lib/types";
import type { CategoryCardConfig } from "./serviceCategories";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

/** Disable all map interactions so the preview is purely visual. */
function DisableInteractions() {
  const map = useMap();
  useEffect(() => {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
  }, [map]);
  return null;
}

function MiniMapPreview({ onShowMap }: { onShowMap: () => void }) {
  const { state } = useApp();
  const points = state.servicePoints.filter(
    (p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng),
  );

  return (
    <button
      onClick={onShowMap}
      className="relative w-full h-full rounded-2xl overflow-hidden group cursor-pointer"
      aria-label="Open full map"
    >
      <MapContainer
        center={MONTGOMERY_CENTER}
        zoom={12}
        className="h-full w-full pointer-events-none"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DisableInteractions />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={4}
            pathOptions={{
              fillColor: getMarkerColor(p.category),
              fillOpacity: 0.8,
              stroke: true,
              color: "#fff",
              weight: 1,
            }}
          />
        ))}
      </MapContainer>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-[hsl(var(--secondary))]/0 group-hover:bg-[hsl(var(--secondary))]/40 transition-colors duration-300 flex items-center justify-center">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/95 shadow-lg text-sm font-semibold text-secondary opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <MapPin className="w-4 h-4" />
          Explore full map
        </div>
      </div>

      {/* Point count badge */}
      {points.length > 0 && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-xs font-medium text-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--pine-green))]" />
          {points.length} locations
        </div>
      )}

    </button>
  );
}

export function DirectoryHero({ onShowMap }: { onShowMap: () => void }) {
  return (
    <div className="px-6 pt-6 pb-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: text content with amber gold accent */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 max-w-[32px] bg-[hsl(var(--amber-gold))]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--amber-gold))]">
              Montgomery, Alabama
            </p>
          </div>
          <h1 className="text-2xl font-bold text-secondary leading-tight tracking-tight">
            City Services
          </h1>
          <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed max-w-md">
            Healthcare, childcare, job training, and more — with locations,
            eligibility details, and step-by-step guides.
          </p>
        </div>

        {/* Right: mini map preview */}
        <div className="lg:col-span-3 flex flex-col gap-1.5">
          <div className="h-[200px] lg:h-[220px] rounded-2xl overflow-hidden border border-border/40 shadow-sm">
            <MiniMapPreview onShowMap={onShowMap} />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
            <MapPin className="w-3 h-3" />
            Tap the map to explore all service locations
          </p>
        </div>
      </div>
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
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search services, locations, or benefits..."
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
      />
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
  const { icon: Icon, label, description, accent, iconBg, iconColor } = config;
  return (
    <button
      onClick={onSelect}
      className="group relative rounded-2xl bg-white border border-border/40 text-left transition-all duration-200 hover:shadow-lg hover:border-border/60 hover:-translate-y-0.5 overflow-hidden magnolia-bg"
    >
      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent} rounded-l-2xl`} />

      <div className="pl-5 pr-5 py-5">
        {/* Icon + arrow row */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center ring-1 ring-black/[0.04]`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-[hsl(var(--amber-gold))] group-hover:translate-x-0.5 transition-all duration-200 mt-1" />
        </div>

        {/* Text */}
        <h3 className="text-[15px] font-semibold text-secondary mb-1 group-hover:text-primary transition-colors">
          {label}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Footer: location count with gold accent */}
        {locationCount > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
            <MapPin className="w-3 h-3 text-[hsl(var(--amber-gold))]" />
            <span className="text-xs font-medium text-muted-foreground">
              {locationCount} location{locationCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
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
      className="w-full relative rounded-2xl border border-[hsl(var(--amber-gold))]/20 bg-[hsl(var(--amber-gold))]/[0.04] p-5 text-left hover:border-[hsl(var(--amber-gold))]/40 hover:bg-[hsl(var(--amber-gold))]/[0.07] transition-all group magnolia-bg overflow-hidden"
    >
      {/* Gold accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--amber-gold))] rounded-l-2xl" />

      <div className="pl-3">
        <p className="text-sm font-semibold text-secondary mb-0.5">Not sure where to start?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tell us your situation and we'll match you with the right services.
        </p>
        <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-[hsl(var(--amber-gold))] group-hover:gap-2.5 transition-all">
          Talk to a guide
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}

/** No longer used — kept export for backward compat */
export function SituationCards({ onSelectCategory }: { onSelectCategory: (c: ServiceCategory) => void }) {
  return null;
}
