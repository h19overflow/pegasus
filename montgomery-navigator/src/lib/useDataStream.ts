import { useEffect, useRef, useState } from "react";
import { useApp } from "./appContext";
import { connectSseStream, type SseMessage } from "./sseClient";
import { parseFeatureToJob, type GeoJsonFeature } from "./jobService";
import type { NewsArticle } from "./types";

/**
 * Connects to the backend SSE stream and dispatches
 * MERGE_* actions as live data arrives.
 */
export function useDataStream(): { isConnected: boolean } {
  const { dispatch } = useApp();
  const [isConnected, setIsConnected] = useState(false);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    const cleanup = connectSseStream({
      url: "/api/stream",
      onStatusChange: setIsConnected,
      onMessage: (msg: SseMessage) => {
        handleSseMessage(msg, dispatchRef.current);
      },
    });
    return cleanup;
  }, []);

  return { isConnected };
}

function handleSseMessage(
  msg: SseMessage,
  dispatch: ReturnType<typeof useApp>["dispatch"],
): void {
  const items = msg.data as unknown[];

  switch (msg.type) {
    case "jobs": {
      const features = items as GeoJsonFeature[];
      const listings = features.map(parseFeatureToJob);
      dispatch({ type: "MERGE_JOB_LISTINGS", listings });
      break;
    }
    case "news": {
      const articles = items as NewsArticle[];
      dispatch({ type: "MERGE_NEWS_ARTICLES", articles });
      break;
    }
    case "housing":
      console.log("[SSE] Housing update received:", items.length, "listings");
      break;
    default:
      console.log("[SSE] Unknown event type:", msg.type);
  }
}
