import { useEffect, useState } from "react";
import type { ServiceCategory } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import { CATEGORY_CARDS, type CategoryCardConfig } from "./serviceCategories";
import { DirectoryHero, DirectorySearchBar, CategoryCard, HelpPromptCard } from "./ServiceDirectoryParts";

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

  return (
    <div className="flex-1 overflow-y-auto">
      <DirectoryHero onShowMap={onShowMap} />

      <div className="px-6 pb-4">
        <DirectorySearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              config={cat}
              locationCount={countLocationsForCategory(cat.id)}
              onSelect={() => onSelectCategory(cat.id)}
            />
          ))}
          {visibleCategories.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No services match &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </div>
      </div>

      <div className="px-6 pb-8">
        <HelpPromptCard onNavigateToChat={onNavigateToChat} />
      </div>
    </div>
  );
}
