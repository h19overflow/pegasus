import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { ServicePoint, ServiceCategory } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];
const DEFAULT_ZOOM = 12;

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  health: "#E74C3C",
  community: "#2ECC71",
  childcare: "#F39C12",
  education: "#3498DB",
  safety: "#E67E22",
  libraries: "#9B59B6",
};

function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function MapDataLoader() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    async function loadCategories() {
      for (const category of state.activeCategories) {
        const existing = state.servicePoints.filter(
          (p) => p.category === category
        );
        if (existing.length > 0) continue;

        const points = await fetchServicePoints(category);
        if (points.length > 0) {
          dispatch({ type: "ADD_SERVICE_POINTS", points });
        }
      }
    }
    loadCategories();
  }, [state.activeCategories]);

  return null;
}

function FlyToPin({ pin }: { pin: ServicePoint | null }) {
  const map = useMap();
  const prevPinRef = useRef<string | null>(null);

  useEffect(() => {
    if (pin && pin.id !== prevPinRef.current) {
      map.flyTo([pin.lat, pin.lng], 15, { duration: 0.8 });
      prevPinRef.current = pin.id;
    }
  }, [pin, map]);

  return null;
}

export function ServiceMap() {
  const { state, dispatch } = useApp();

  const visiblePoints = state.servicePoints.filter(
    (p) =>
      state.activeCategories.includes(p.category) &&
      typeof p.lat === "number" &&
      typeof p.lng === "number" &&
      !Number.isNaN(p.lat) &&
      !Number.isNaN(p.lng)
  );

  function handleMarkerClick(point: ServicePoint) {
    dispatch({ type: "SET_SELECTED_PIN", pin: point });
  }

  return (
    <MapContainer
      center={MONTGOMERY_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapDataLoader />
      <FlyToPin pin={state.selectedPin} />
      {visiblePoints.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={createColoredIcon(CATEGORY_COLORS[point.category])}
          eventHandlers={{ click: () => handleMarkerClick(point) }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{point.name}</p>
              {point.address && <p className="text-gray-600">{point.address}</p>}
              {point.phone && <p>{point.phone}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
