import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/appContext";
import { estimateCommutes, getDefaultUserLocation } from "@/lib/commuteEngine";
import { fetchTransitRoutes } from "@/lib/transitService";

export type SortMode = "distance" | "driving" | "transit";

export function useCommuteEstimates() {
  const { state, dispatch } = useApp();
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const hasCv = !!state.cvData;

  useEffect(() => {
    if (state.transitRoutes.length > 0) return;
    fetchTransitRoutes().then((routes) => {
      dispatch({ type: "SET_TRANSIT_ROUTES", routes });
    });
  }, []);

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

  const jobCoords = useMemo(() => {
    const coordMap = new Map<string, { lat: number; lng: number }>();
    for (const job of state.jobListings) {
      if (job.lat && job.lng) {
        coordMap.set(job.id, { lat: job.lat, lng: job.lng });
      }
    }
    return coordMap;
  }, [state.jobListings]);

  return {
    sortMode,
    setSortMode,
    sortedEstimates,
    jobCoords,
    transitRouteCount: state.transitRoutes.length,
  };
}
