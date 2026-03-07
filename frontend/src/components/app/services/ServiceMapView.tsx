import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import "@/lib/leafletSetup";
import { createCategoryMarker, getMarkerColor, getMarkerSymbol } from "@/lib/mapMarkers";
import { MAP_CATEGORIES } from "./serviceCategoryMeta";
import { NeighborhoodOverlay } from "./NeighborhoodOverlay";
import { ServiceGuideChat } from "./ServiceGuideChat";
import { FlyToPoint } from "./map/FlyToPoint";
import { MapCommandHandler } from "./map/MapCommandHandler";
import { CategoryFilterBar } from "./map/CategoryFilterBar";
import { ServiceMapDetail } from "./map/ServiceMapDetail";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

interface ServiceMapViewProps {
  onBack: () => void;
  onSelectCategory: (category: ServiceCategory) => void;
  onNavigateToChat: (msg: string) => void;
}

export default function ServiceMapView({ onBack, onSelectCategory, onNavigateToChat }: ServiceMapViewProps) {
  const { state, dispatch } = useApp();
  const [activeCategories, setActiveCategories] = useState<Set<ServiceCategory>>(
    new Set(MAP_CATEGORIES.map((c) => c.id)),
  );
  const [selectedPoint, setSelectedPoint] = useState<ServicePoint | null>(null);
  const [showNeighborhood, setShowNeighborhood] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Auto-open guide panel when a "More details" message arrives
  useEffect(() => {
    if (state.guidePendingMessage && !guideOpen) {
      setGuideOpen(true);
    }
  }, [state.guidePendingMessage]);

  // Listen for filter_category map commands (chat -> map)
  useEffect(() => {
    const cmd = state.mapCommand;
    if (!cmd) return;
    if (cmd.type === "filter_category" && cmd.category) {
      setActiveCategories(new Set([cmd.category]));
    }
  }, [state.mapCommand]);

  useEffect(() => {
    async function loadAll() {
      for (const cat of MAP_CATEGORIES) {
        const alreadyLoaded = state.servicePoints.some((p) => p.category === cat.id);
        if (alreadyLoaded) continue;
        const points = await fetchServicePoints(cat.id);
        if (points.length > 0) dispatch({ type: "ADD_SERVICE_POINTS", points });
      }
    }
    loadAll();
  }, []);

  function toggleCategory(id: ServiceCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const visiblePoints = state.servicePoints.filter(
    (p) => activeCategories.has(p.category) && !Number.isNaN(p.lat) && !Number.isNaN(p.lng),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <h1 className="text-base font-bold text-foreground">All Services Map</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{visiblePoints.length} locations</span>
          <button
            onClick={() => setGuideOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              guideOpen
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Guide
          </button>
        </div>
      </div>

      <CategoryFilterBar
        activeCategories={activeCategories}
        servicePoints={state.servicePoints}
        onToggleCategory={toggleCategory}
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <MapContainer center={MONTGOMERY_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visiblePoints.map((point) => (
              <Marker key={point.id} position={[point.lat, point.lng]}
                icon={createCategoryMarker(point.category)}
                eventHandlers={{ click: () => setSelectedPoint(point) }}
              >
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <p className="font-semibold">{point.name}</p>
                    {point.address && <p className="text-gray-500">{point.address}</p>}
                    {point.phone && <p className="mt-1">{point.phone}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
            <FlyToPoint lat={selectedPoint?.lat ?? null} lng={selectedPoint?.lng ?? null} />
            <MapCommandHandler visiblePoints={visiblePoints} />
            {showNeighborhood && <NeighborhoodOverlay />}
          </MapContainer>

          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm z-[1000] flex flex-wrap gap-x-4 gap-y-1">
            {MAP_CATEGORIES.filter((c) => activeCategories.has(c.id)).map(({ id, label }) => (
              <div key={id} className="flex items-center gap-1.5">
                <span className="text-xs">{getMarkerSymbol(id)}</span>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getMarkerColor(id) }} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

        </div>

        {selectedPoint && (
          <ServiceMapDetail
            point={selectedPoint}
            categories={MAP_CATEGORIES}
            onClose={() => setSelectedPoint(null)}
            onNavigateToChat={onNavigateToChat}
            onViewCategory={() => onSelectCategory(selectedPoint.category)}
          />
        )}

        {guideOpen && (
          <div className="w-[340px] shrink-0 border-l border-border/30 bg-white">
            <ServiceGuideChat />
          </div>
        )}
      </div>
    </div>
  );
}
