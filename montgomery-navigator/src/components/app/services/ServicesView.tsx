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
  const { state } = useApp();

  function handleSelectCategory(category: ServiceCategory) {
    setSelectedCategory(category);
    setMode("detail");
  }

  function handleBackToDirectory() {
    setSelectedCategory(null);
    setMode("directory");
  }

  // When a roadmap is active, show it fullscreen.
  // ServiceRoadmapView has its own X button that dispatches CLEAR_ROADMAP,
  // which sets activeRoadmap back to null and restores the normal view.
  if (state.activeRoadmap) {
    return <ServiceRoadmapView />;
  }

  if (mode === "detail" && selectedCategory) {
    return (
      <ServiceDetailView
        category={selectedCategory}
        onBack={handleBackToDirectory}
        onNavigateToChat={onNavigateToChat}
      />
    );
  }

  if (mode === "map") {
    return (
      <ServiceMapView
        onBack={() => setMode("directory")}
        onSelectCategory={handleSelectCategory}
        onNavigateToChat={onNavigateToChat}
      />
    );
  }

  return (
    <ServiceDirectory
      onSelectCategory={handleSelectCategory}
      onShowMap={() => setMode("map")}
      onNavigateToChat={onNavigateToChat}
    />
  );
}
