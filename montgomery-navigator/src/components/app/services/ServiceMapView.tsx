import { useEffect, useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import "@/lib/leafletSetup";
import { MAP_CATEGORIES } from "./serviceCategoryMeta";
import { MapPointDetailPanel } from "./MapPointDetailPanel";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color:${color};width:11px;height:11px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
  });
}

function FlyToPoint({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${lat},${lng}`;
    if (lat !== null && lng !== null && key !== prevRef.current) {
      map.flyTo([lat, lng], 15, { duration: 0.6 });
      prevRef.current = key;
    }
  }, [lat, lng, map]);
  return null;
}

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
  const markerColorMap = Object.fromEntries(MAP_CATEGORIES.map((c) => [c.id, c.markerColor]));

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <h1 className="text-base font-bold text-foreground">All Services Map</h1>
        </div>
        <span className="text-xs text-muted-foreground">{visiblePoints.length} locations</span>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2 px-6 py-3 border-b border-border/20">
        {MAP_CATEGORIES.map(({ id, label, icon: Icon, color }) => {
          const active = activeCategories.has(id);
          const count = state.servicePoints.filter((p) => p.category === id).length;
          return (
            <button key={id} onClick={() => toggleCategory(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${active ? color : "bg-muted/30 text-muted-foreground border-transparent opacity-50"}`}
            >
              <Icon className="h-3.5 w-3.5" />{label}
              {count > 0 && <span className="text-[10px] opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <MapContainer center={MONTGOMERY_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visiblePoints.map((point) => (
              <Marker key={point.id} position={[point.lat, point.lng]}
                icon={createMarkerIcon(markerColorMap[point.category] ?? "#888")}
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
          </MapContainer>

          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm z-[1000] flex flex-wrap gap-x-4 gap-y-1">
            {MAP_CATEGORIES.filter((c) => activeCategories.has(c.id)).map(({ id, label, markerColor }) => (
              <div key={id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: markerColor }} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedPoint && (
          <div className="w-[340px] shrink-0 border-l border-border/30 overflow-y-auto bg-white">
            <MapPointDetailPanel
              point={selectedPoint}
              categories={MAP_CATEGORIES}
              onClose={() => setSelectedPoint(null)}
              onNavigateToChat={onNavigateToChat}
              onViewCategory={() => onSelectCategory(selectedPoint.category)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
