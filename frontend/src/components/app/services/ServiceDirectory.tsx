import { useEffect, useState } from "react";
import { MapPin, FileText } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import { fetchServiceGuides, searchGuides, type ServiceGuide } from "@/lib/govServices";
import { CATEGORY_CARDS, type CategoryCardConfig } from "./serviceCategories";
import { DirectoryHero, DirectorySearchBar, HelpPromptCard } from "./ServiceDirectoryParts";
import { ServicesTabContent, BenefitsTabContent } from "./DirectoryTabContent";

type DirectoryTab = "services" | "benefits";

interface ServiceDirectoryProps {
  onSelectCategory: (category: ServiceCategory) => void;
  onShowMap: () => void;
  onNavigateToChat: (message: string) => void;
}

export default function ServiceDirectory({
  onSelectCategory,
  onShowMap,
  onNavigateToChat,
}: ServiceDirectoryProps) {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [guides, setGuides] = useState<ServiceGuide[]>([]);
  const [activeTab, setActiveTab] = useState<DirectoryTab>("services");

  useEffect(() => {
    async function preloadAllCategories() {
      for (const cat of CATEGORY_CARDS) {
        const alreadyLoaded = state.servicePoints.some((p) => p.category === cat.id);
        if (alreadyLoaded) continue;
        const points = await fetchServicePoints(cat.id);
        if (points.length > 0) dispatch({ type: "ADD_SERVICE_POINTS", points });
      }
    }
    preloadAllCategories();
    fetchServiceGuides().then(setGuides);
  }, []);

  function countLocationsForCategory(id: ServiceCategory): number {
    return state.servicePoints.filter((p) => p.category === id).length;
  }

  function matchesCategorySearch(cat: CategoryCardConfig): boolean {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cat.label.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query) ||
      state.servicePoints
        .filter((p) => p.category === cat.id)
        .some((p) => p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query))
    );
  }

  const visibleCategories = CATEGORY_CARDS.filter(matchesCategorySearch);
  const filteredGuides = searchQuery ? searchGuides(guides, searchQuery) : guides;

  return (
    <div className="flex-1 overflow-y-auto">
      <DirectoryHero onShowMap={onShowMap} />

      <div className="px-8 pb-4">
        <DirectorySearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <div className="px-8 pb-4">
        <DirectoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          servicesCount={state.servicePoints.length}
          benefitsCount={filteredGuides.length}
        />
      </div>

      {activeTab === "services" ? (
        <ServicesTabContent
          visibleCategories={visibleCategories}
          searchQuery={searchQuery}
          countLocations={countLocationsForCategory}
          onSelectCategory={onSelectCategory}
        />
      ) : (
        <BenefitsTabContent
          guides={filteredGuides}
          searchQuery={searchQuery}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      <div className="px-8 pb-8">
        <HelpPromptCard onNavigateToChat={onNavigateToChat} />
      </div>
    </div>
  );
}

function DirectoryTabs({
  activeTab,
  onTabChange,
  servicesCount,
  benefitsCount,
}: {
  activeTab: DirectoryTab;
  onTabChange: (tab: DirectoryTab) => void;
  servicesCount: number;
  benefitsCount: number;
}) {
  const tabs = [
    { id: "services" as const, label: "Services", icon: MapPin, count: servicesCount },
    { id: "benefits" as const, label: "Benefits", icon: FileText, count: benefitsCount },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map(({ id, label, icon: Icon, count }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={[
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white border border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
