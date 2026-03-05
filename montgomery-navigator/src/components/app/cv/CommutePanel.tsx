import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Car,
  Bus,
  Footprints,
  ArrowUpDown,
  Clock,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { useApp } from "@/lib/appContext";
import { estimateCommutes, getDefaultUserLocation } from "@/lib/commuteEngine";
import { fetchTransitRoutes } from "@/lib/transitService";
import type { CommuteEstimate } from "@/lib/types";
import "@/lib/leafletSetup";

type SortMode = "distance" | "driving" | "transit";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];
const DEFAULT_ZOOM = 12;

const JOB_ICON = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background-color: #1E3A5F;
    width: 10px; height: 10px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const SELECTED_JOB_ICON = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background-color: #D97706;
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const USER_ICON = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background-color: #10B981;
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyToJob({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.flyTo([lat, lng], 14, { duration: 0.6 });
    }
  }, [lat, lng, map]);
  return null;
}

const CommutePanel = () => {
  const { state, dispatch } = useApp();
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const hasCv = !!state.cvData;

  // Load transit routes on mount
  useEffect(() => {
    if (state.transitRoutes.length > 0) return;
    fetchTransitRoutes().then((routes) => {
      dispatch({ type: "SET_TRANSIT_ROUTES", routes });
    });
  }, []);

  // Compute commute estimates when matches change
  useEffect(() => {
    if (state.jobMatches.length === 0 && state.jobListings.length === 0) return;

    const userLocation = getDefaultUserLocation();
    const jobs = hasCv
      ? state.jobMatches
      : state.jobListings.map((j) => ({
          ...j,
          matchPercent: 0,
          matchedSkills: [] as string[],
          missingSkills: [] as string[],
        }));

    const estimates = estimateCommutes(
      jobs,
      userLocation.lat,
      userLocation.lng,
      state.transitRoutes,
    );
    dispatch({ type: "SET_COMMUTE_ESTIMATES", estimates });
  }, [state.jobMatches, state.jobListings, state.transitRoutes]);

  const sortedEstimates = useMemo(() => {
    const copy = [...state.commuteEstimates];
    if (sortMode === "driving") {
      copy.sort((a, b) => a.drivingMinutes - b.drivingMinutes);
    } else if (sortMode === "transit") {
      copy.sort((a, b) => (a.transitMinutes ?? 999) - (b.transitMinutes ?? 999));
    }
    return copy;
  }, [state.commuteEstimates, sortMode]);

  // Build job coordinate lookup from listings
  const jobCoords = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const job of state.jobListings) {
      if (job.lat && job.lng) {
        map.set(job.id, { lat: job.lat, lng: job.lng });
      }
    }
    return map;
  }, [state.jobListings]);

  const userLocation = getDefaultUserLocation();

  const selectedCoords = selectedJobId ? jobCoords.get(selectedJobId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Map — top half */}
      <div className="h-[45%] shrink-0 relative">
        <MapContainer
          center={MONTGOMERY_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User location */}
          <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">Your Location</p>
                <p className="text-gray-500">Downtown Montgomery</p>
              </div>
            </Popup>
          </Marker>

          {/* User location pulse ring */}
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={20}
            pathOptions={{ color: "#10B981", weight: 1, fillColor: "#10B981", fillOpacity: 0.1 }}
          />

          {/* Job markers */}
          {state.jobListings
            .filter((job) => job.lat && job.lng)
            .map((job) => (
              <Marker
                key={job.id}
                position={[job.lat, job.lng]}
                icon={selectedJobId === job.id ? SELECTED_JOB_ICON : JOB_ICON}
                eventHandlers={{ click: () => setSelectedJobId(job.id) }}
              >
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-gray-500">{job.company}</p>
                    {job.salary && <p className="font-medium mt-1">{job.salary}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

          <FlyToJob
            lat={selectedCoords?.lat ?? null}
            lng={selectedCoords?.lng ?? null}
          />
        </MapContainer>

        {/* Map legend */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm z-[1000] flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#10B981] border-2 border-white shadow-sm" />
            <span className="text-[10px] text-muted-foreground">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F] border-2 border-white shadow-sm" />
            <span className="text-[10px] text-muted-foreground">Jobs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bus className="w-3 h-3 text-blue-600" />
            <span className="text-[10px] text-muted-foreground">{state.transitRoutes.length} bus routes</span>
          </div>
        </div>
      </div>

      {/* List — bottom half */}
      <div className="flex-1 overflow-y-auto border-t border-border/50">
        {/* Sort bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-border/30 sticky top-0 z-10">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            {([
              { key: "distance", label: "Distance" },
              { key: "driving", label: "Driving" },
              { key: "transit", label: "Transit" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortMode(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortMode === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {sortedEstimates.length} jobs
          </span>
        </div>

        {/* Commute cards */}
        <div className="space-y-1 p-2">
          {sortedEstimates.map((estimate) => (
            <CommuteCard
              key={estimate.jobId}
              estimate={estimate}
              isSelected={selectedJobId === estimate.jobId}
              onSelect={() => setSelectedJobId(estimate.jobId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

function CommuteCard({
  estimate,
  isSelected,
  onSelect,
}: {
  estimate: CommuteEstimate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg p-3 flex items-center gap-4 transition-colors ${
        isSelected
          ? "bg-primary/5 border border-primary/30"
          : "bg-white border border-border/30 hover:bg-muted/30"
      }`}
    >
      {/* Job info */}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold text-foreground truncate">{estimate.jobTitle}</h4>
        <p className="text-xs text-muted-foreground truncate">{estimate.company}</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="w-2.5 h-2.5" />
          {estimate.distanceMiles} mi
        </p>
      </div>

      {/* Travel modes */}
      <div className="flex items-center gap-3 shrink-0">
        <TravelMode
          icon={Car}
          minutes={estimate.drivingMinutes}
          label="Drive"
          color="text-foreground"
        />
        {estimate.transitMinutes !== null && (
          <TravelMode
            icon={Bus}
            minutes={estimate.transitMinutes}
            label="Bus"
            color="text-blue-600"
          />
        )}
        {estimate.walkingMinutes !== null && (
          <TravelMode
            icon={Footprints}
            minutes={estimate.walkingMinutes}
            label="Walk"
            color="text-emerald-600"
          />
        )}
      </div>
    </button>
  );
}

function TravelMode({
  icon: Icon,
  minutes,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  minutes: number;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <Icon className={`w-4 h-4 mx-auto ${color}`} />
      <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-0.5 justify-center">
        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
        {minutes}m
      </p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default CommutePanel;
