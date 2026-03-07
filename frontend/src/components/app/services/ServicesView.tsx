import { useEffect, useState } from "react";
import ServiceDirectory from "./ServiceDirectory";
import ServiceDetailView from "./ServiceDetailView";
import ServiceMapView from "./ServiceMapView";
import { ServiceRoadmapView } from "./ServiceRoadmapView";
import { useApp } from "@/lib/appContext";
import type { ServiceCategory } from "@/lib/types";

type ServicesMode = "directory" | "map" | "detail";

interface ServicesViewProps {
  onNavigateToChat: (message: string) => void;
}

export function ServicesView({ onNavigateToChat }: ServicesViewProps) {
  const { state, dispatch } = useApp();
  const [mode, setMode] = useState<ServicesMode>("directory");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  // Auto-switch to map when an article is selected (e.g. from admin chat)
  useEffect(() => {
    if (state.selectedArticleId && mode !== "map") {
      setMode("map");
    }
  }, [state.selectedArticleId]);

  function handleSelectCategory(category: ServiceCategory) {
    setSelectedCategory(category);
    setMode("detail");
  }

  function handleBackToDirectory() {
    setSelectedCategory(null);
    setMode("directory");
  }

  function handleCloseRoadmap() {
    dispatch({ type: "CLEAR_ROADMAP" });
  }

  return (
    <div className="relative flex h-full flex-col">
      {mode === "detail" && selectedCategory ? (
        <ServiceDetailView
          category={selectedCategory}
          onBack={handleBackToDirectory}
          onNavigateToChat={onNavigateToChat}
        />
      ) : mode === "map" ? (
        <ServiceMapView
          onBack={() => setMode("directory")}
          onSelectCategory={handleSelectCategory}
          onNavigateToChat={onNavigateToChat}
        />
      ) : (
        <ServiceDirectory
          onSelectCategory={handleSelectCategory}
          onShowMap={() => setMode("map")}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      {state.activeRoadmap && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseRoadmap();
            }
          }}
        >
          <div className="flex max-h-[85%] w-full flex-col overflow-hidden bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-w-lg sm:rounded-2xl sm:zoom-in-95">
            <ServiceRoadmapView />
          </div>
        </div>
      )}
    </div>
  );
}
