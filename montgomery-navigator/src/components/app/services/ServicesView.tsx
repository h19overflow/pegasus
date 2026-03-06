import { useState } from "react";
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
  const [mode, setMode] = useState<ServicesMode>("directory");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const { state, dispatch } = useApp();

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
    <div className="relative flex flex-col h-full">
      {/* ── Main content (always rendered beneath the modal) ── */}
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

      {/* ── Roadmap modal overlay ── */}
      {state.activeRoadmap && (
        <div
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            // Close when clicking the backdrop (not the panel itself)
            if (e.target === e.currentTarget) handleCloseRoadmap();
          }}
        >
          <div className="w-full max-h-[85%] sm:max-w-lg sm:rounded-2xl overflow-hidden shadow-2xl bg-background flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <ServiceRoadmapView />
          </div>
        </div>
      )}
    </div>
  );
}
