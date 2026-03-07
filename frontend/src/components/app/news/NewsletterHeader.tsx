import { Newspaper, Search } from "lucide-react";
import { NewsCategoryTabs } from "./NewsCategoryTabs";
import type { NewsCategory } from "@/lib/types";
import type { SortMode } from "./newsletterHelpers";

interface NewsletterHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortMode: SortMode;
  onSortChange: (m: SortMode) => void;
  newsCategory: NewsCategory;
  onCategoryChange: (c: NewsCategory) => void;
  articleCounts: Record<string, number>;
}

export function NewsletterHeader({ searchQuery, onSearchChange, sortMode, onSortChange, newsCategory, onCategoryChange, articleCounts }: NewsletterHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border/50 bg-white px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Montgomery Newsletter</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-border/50 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 w-48"
            />
          </div>
          <select
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className="text-xs border border-border/50 rounded-lg px-2 py-1.5 bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most_liked">Most Liked</option>
          </select>
        </div>
      </div>
      <NewsCategoryTabs activeCategory={newsCategory} onCategoryChange={onCategoryChange} articleCounts={articleCounts} />
    </div>
  );
}
