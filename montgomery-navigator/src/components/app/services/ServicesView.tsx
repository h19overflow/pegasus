import { useState, useEffect } from "react";
import ServiceDirectory from "./ServiceDirectory";
import ServiceDetailView from "./ServiceDetailView";
import ServiceMapView from "./ServiceMapView";
import type { ServiceCategory } from "@/lib/types";
import { useApp } from "@/lib/appContext";

type ServicesMode = "directory" | "map" | "detail";

interface ServicesViewProps {
  onNavigateToChat: (message: string) => void;
}

export function ServicesView({ onNavigateToChat }: ServicesViewProps) {
  const { state } = useApp();
  const [mode, setMode] = useState<ServicesMode>("directory");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  // Auto-switch to map mode when a map command arrives
  useEffect(() => {
    if (state.mapCommand && mode !== "map") {
      setMode("map");
    }
  }, [state.mapCommand]);

  function handleSelectCategory(category: ServiceCategory) {
    setSelectedCategory(category);
    setMode("detail");
  }

  function handleBackToDirectory() {
    setSelectedCategory(null);
    setMode("directory");
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
