import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles } from "@/lib/newsService";
import { filterGeolocatedArticles } from "@/lib/newsMapMarkers";
import { NewsMapOverlay } from "./NewsMapOverlay";
import { NewsSidebarPanel } from "./NewsSidebarPanel";
import { NewsSentimentLegend } from "./NewsSentimentLegend";
import "@/lib/leafletSetup";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

function FlyToArticle({ target }: { target: { lat: number; lng: number; ts: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15, { duration: 0.6 });
    }
  }, [target, map]);
  return null;
}

export function NewsMapTab() {
  const { state, dispatch } = useApp();
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [focusedArticle, setFocusedArticle] = useState<{ id: string; ts: number } | null>(null);

  useEffect(() => {
    if (state.newsArticles.length === 0) {
      fetchNewsArticles().then((articles) => {
        if (articles.length > 0) {
          dispatch({ type: "SET_NEWS_ARTICLES", articles });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!state.newsMapVisible) {
      dispatch({ type: "TOGGLE_NEWS_MAP" });
    }
  }, []);

  function handleSelectArticle(articleId: string) {
    const article = state.newsArticles.find((a) => a.id === articleId);
    if (article?.location) {
      const ts = Date.now();
      setFlyTarget({ lat: article.location.lat, lng: article.location.lng, ts });
      setFocusedArticle({ id: articleId, ts });
    }
  }

  function handleZoomToNeighborhood(lat: number, lng: number) {
    setFlyTarget({ lat, lng, ts: Date.now() });
  }

  const geoArticles = filterGeolocatedArticles(state.newsArticles);

  return (
    <div className="flex-1 flex min-h-0 relative">
      <div className="flex-1 relative">
        <MapContainer center={MONTGOMERY_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <NewsMapOverlay
            selectedArticleId={focusedArticle?.id ?? null}
            selectionTs={focusedArticle?.ts ?? 0}
          />
          <FlyToArticle target={flyTarget} />
        </MapContainer>

        <NewsSentimentLegend
          articles={geoArticles}
          reactionCounts={state.newsReactions}
          mode={state.newsMapMode}
          onModeChange={(mode) => dispatch({ type: "SET_NEWS_MAP_MODE", mode })}
        />

        <NewsSidebarPanel
          articles={geoArticles}
          reactionCounts={state.newsReactions}
          comments={state.newsComments}
          mode={state.newsMapMode}
          onModeChange={(mode) => dispatch({ type: "SET_NEWS_MAP_MODE", mode })}
          onZoomToNeighborhood={handleZoomToNeighborhood}
          onSelectArticle={handleSelectArticle}
          focusedArticleId={focusedArticle?.id ?? null}
        />
      </div>
    </div>
  );
}
