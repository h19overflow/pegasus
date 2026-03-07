import { useEffect, useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import "@/lib/leafletSetup";
import { createCategoryMarker, getMarkerColor, getMarkerSymbol } from "@/lib/mapMarkers";
import { MAP_CATEGORIES } from "./serviceCategoryMeta";
import { MapPointDetailPanel } from "./MapPointDetailPanel";
import { NeighborhoodOverlay } from "./NeighborhoodOverlay";
import { NewsMapOverlay } from "../news/NewsMapOverlay";
import { NewsMapToggle } from "../news/NewsMapToggle";
import { NewsSidebarPanel } from "../news/NewsSidebarPanel";
import { filterGeolocatedArticles } from "@/lib/newsMapMarkers";
import { fetchNewsArticles } from "@/lib/newsService";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

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

function FlyToTarget({ target }: { target: { lat: number; lng: number; ts: number } | null }) {
  const map = useMap();
  const prevTs = useRef<number>(0);
  useEffect(() => {
    if (target && target.ts !== prevTs.current) {
      map.flyTo([target.lat, target.lng], 15, { duration: 0.6 });
      prevTs.current = target.ts;
    }
  }, [target, map]);
  return null;
}

/** Listens for map commands dispatched from the chat and executes them. */
function MapCommandHandler({ visiblePoints }: { visiblePoints: ServicePoint[] }) {
  const map = useMap();
  const { state, dispatch } = useApp();
  const prevCmdRef = useRef<string | null>(null);

  useEffect(() => {
    const cmd = state.mapCommand;
    if (!cmd || cmd.id === prevCmdRef.current) return;
    prevCmdRef.current = cmd.id;

    switch (cmd.type) {
      case "zoom_to":
        if (cmd.lat != null && cmd.lng != null) {
          map.flyTo([cmd.lat, cmd.lng], cmd.zoom ?? 14, { duration: 0.8 });
        }
        break;
      case "filter_category":
        if (cmd.lat != null && cmd.lng != null) {
          map.flyTo([cmd.lat, cmd.lng], cmd.zoom ?? 14, { duration: 0.8 });
        } else if (visiblePoints.length > 0) {
          const bounds = L.latLngBounds(visiblePoints.map((p) => [p.lat, p.lng] as [number, number]));
          map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8, maxZoom: 14 });
        }
        break;
      case "highlight_hotspots":
        break;
      case "clear":
        map.flyTo(MONTGOMERY_CENTER, 12, { duration: 0.6 });
        break;
    }

    setTimeout(() => dispatch({ type: "CLEAR_MAP_COMMAND" }), 300);
  }, [state.mapCommand, map, dispatch, visiblePoints]);

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
  const [showNeighborhood, setShowNeighborhood] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [focusedArticle, setFocusedArticle] = useState<{ id: string; ts: number } | null>(null);

  // Listen for filter_category map commands (chat -> map)
  useEffect(() => {
    const cmd = state.mapCommand;
    if (!cmd) return;
    if (cmd.type === "filter_category" && cmd.category) {
      setActiveCategories(new Set([cmd.category]));
    }
  }, [state.mapCommand]);

  // Sync global selectedArticleId -> local focusedArticle (for cross-page navigation)
  useEffect(() => {
    if (state.selectedArticleId) {
      setFocusedArticle({ id: state.selectedArticleId, ts: Date.now() });
      if (!state.newsMapVisible) dispatch({ type: "TOGGLE_NEWS_MAP" });
      dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
    }
  }, [state.selectedArticleId]);

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

  useEffect(() => {
    if (state.newsArticles.length === 0) {
      fetchNewsArticles().then((articles) => {
        if (articles.length > 0) {
          dispatch({ type: "SET_NEWS_ARTICLES", articles });
        }
      });
    }
  }, []);

  function handleZoomToNeighborhood(lat: number, lng: number) {
    setFlyTarget({ lat, lng, ts: Date.now() });
  }

  function handleSelectArticle(articleId: string) {
    const article = state.newsArticles.find((a) => a.id === articleId);
    if (article?.location) {
      const ts = Date.now();
      setFlyTarget({ lat: article.location.lat, lng: article.location.lng, ts });
      setFocusedArticle({ id: articleId, ts });
    }
  }

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
  const geolocatedNewsCount = filterGeolocatedArticles(state.newsArticles).length;

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
          <button
            onClick={() => setShowNeighborhood(!showNeighborhood)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
              showNeighborhood
                ? "bg-primary text-white shadow-primary/25"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            {showNeighborhood ? "✕ Hide" : "◉ Show"} Neighborhood Health
          </button>
          <NewsMapToggle
            active={state.newsMapVisible}
            onToggle={() => dispatch({ type: "TOGGLE_NEWS_MAP" })}
            articleCount={geolocatedNewsCount}
          />
          <span className="text-xs text-muted-foreground">{visiblePoints.length} locations</span>
        </div>
      </div>

      {!state.newsMapVisible && (
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
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <MapContainer center={MONTGOMERY_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!state.newsMapVisible && visiblePoints.map((point) => (
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
            <FlyToTarget target={flyTarget} />
            <MapCommandHandler visiblePoints={visiblePoints} />
            {showNeighborhood && <NeighborhoodOverlay />}
            {state.newsMapVisible && <NewsMapOverlay selectedArticleId={focusedArticle?.id ?? null} selectionTs={focusedArticle?.ts ?? 0} />}
          </MapContainer>

          {!state.newsMapVisible && (
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm z-[1000] flex flex-wrap gap-x-4 gap-y-1">
              {MAP_CATEGORIES.filter((c) => activeCategories.has(c.id)).map(({ id, label }) => (
                <div key={id} className="flex items-center gap-1.5">
                  <span className="text-xs">{getMarkerSymbol(id)}</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getMarkerColor(id) }} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          )}

          {state.newsMapVisible && (
            <NewsSidebarPanel
              articles={filterGeolocatedArticles(state.newsArticles)}
              reactionCounts={state.newsReactions}
              comments={state.newsComments}
              mode={state.newsMapMode}
              onModeChange={(mode) => dispatch({ type: "SET_NEWS_MAP_MODE", mode })}
              onZoomToNeighborhood={handleZoomToNeighborhood}
              onSelectArticle={handleSelectArticle}
              focusedArticleId={focusedArticle?.id ?? null}
            />
          )}
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
