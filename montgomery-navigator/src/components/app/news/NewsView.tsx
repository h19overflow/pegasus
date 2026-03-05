import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles, filterArticlesByCategory, sortArticlesByDate } from "@/lib/newsService";
import { NewsCard } from "./NewsCard";
import { NewsDetail } from "./NewsDetail";
import { NewsCategoryTabs } from "./NewsCategoryTabs";
import type { NewsArticle, NewsCategory } from "@/lib/types";
import {
  Newspaper,
  Search,
  ArrowUpDown,
} from "lucide-react";

type SortMode = "newest" | "oldest" | "most_liked";

function isArticleLiked(likedIds: string[], articleId: string): boolean {
  if (!likedIds || !Array.isArray(likedIds)) return false;
  return likedIds.includes(articleId);
}

function buildArticleCountsPerCategory(articles: NewsArticle[]): Record<string, number> {
  const counts: Record<string, number> = { all: articles.length };
  for (const article of articles) {
    counts[article.category] = (counts[article.category] ?? 0) + 1;
  }
  return counts;
}

function formatLastScrapedTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-background p-4 flex flex-col gap-3">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

function sortArticles(articles: NewsArticle[], sortMode: SortMode): NewsArticle[] {
  if (sortMode === "most_liked") {
    return [...articles].sort((a, b) => b.upvotes - a.upvotes);
  }
  const sorted = sortArticlesByDate(articles);
  return sortMode === "oldest" ? sorted.reverse() : sorted;
}

function filterBySearch(articles: NewsArticle[], query: string): NewsArticle[] {
  if (!query.trim()) return articles;
  const q = query.toLowerCase();
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.source.toLowerCase().includes(q),
  );
}

function filterBySource(articles: NewsArticle[], source: string): NewsArticle[] {
  if (!source) return articles;
  return articles.filter((a) => a.source === source);
}

export function NewsView() {
  const { state, dispatch } = useApp();
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [sourceFilter, setSourceFilter] = useState("");

  async function loadArticles() {
    dispatch({ type: "SET_NEWS_LOADING", loading: true });
    try {
      const articles = await fetchNewsArticles();
      dispatch({ type: "SET_NEWS_ARTICLES", articles });

      if (!lastScraped) {
        const response = await fetch("/data/news_feed.json");
        const data = await response.json();
        if (data.lastScraped) setLastScraped(data.lastScraped);
      }
    } catch (error) {
      console.error("[NewsView] Failed to load news articles", error);
    } finally {
      dispatch({ type: "SET_NEWS_LOADING", loading: false });
    }
  }

  useEffect(() => { loadArticles(); }, []);

  function handleCategoryChange(category: NewsCategory) {
    dispatch({ type: "SET_NEWS_CATEGORY", category });
  }

  function handleSelectArticle(article: NewsArticle) {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: article.id });
  }

  function handleBackToFeed() {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
  }

  function handleToggleLike(articleId: string) {
    dispatch({ type: "TOGGLE_ARTICLE_LIKE", articleId });
  }

  // Unique sources for dropdown
  const uniqueSources = useMemo(() => {
    const sources = new Set(state.newsArticles.map((a) => a.source).filter(Boolean));
    return [...sources].sort();
  }, [state.newsArticles]);

  // Article detail view
  const selectedArticle = state.selectedArticleId
    ? state.newsArticles.find((a) => a.id === state.selectedArticleId)
    : null;

  if (selectedArticle) {
    return (
      <NewsDetail
        article={selectedArticle}
        isLiked={isArticleLiked(state.likedArticleIds, selectedArticle.id)}
        onBack={handleBackToFeed}
        onLike={handleToggleLike}
      />
    );
  }

  // Apply filters + sort
  const afterCategory = filterArticlesByCategory(state.newsArticles, state.newsCategory);
  const afterSource = filterBySource(afterCategory, sourceFilter);
  const afterSearch = filterBySearch(afterSource, searchQuery);
  const visibleArticles = sortArticles(afterSearch, sortMode);
  const articleCounts = buildArticleCountsPerCategory(state.newsArticles);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-white px-5 py-4 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Montgomery News</h2>
          </div>
          {lastScraped && (
            <span className="text-[11px] text-muted-foreground">
              Updated {formatLastScrapedTimestamp(lastScraped)}
            </span>
          )}
        </div>

        {/* Category tabs */}
        <NewsCategoryTabs
          activeCategory={state.newsCategory}
          onCategoryChange={handleCategoryChange}
          articleCounts={articleCounts}
        />

        {/* Search + Sort + Source filter row */}
        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles, sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 rounded-lg border border-border/50 overflow-hidden">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground ml-2.5" />
            {(
              [
                { key: "newest", label: "Newest" },
                { key: "oldest", label: "Oldest" },
                { key: "most_liked", label: "Popular" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortMode(key)}
                className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                  sortMode === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-border/50 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[120px]"
          >
            <option value="">All Sources</option>
            {uniqueSources.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-muted/20 border-b border-border/30">
        <span className="text-xs text-muted-foreground">
          {visibleArticles.length} article{visibleArticles.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
          {sourceFilter && ` from ${sourceFilter}`}
        </span>
        {(searchQuery || sourceFilter) && (
          <button
            onClick={() => { setSearchQuery(""); setSourceFilter(""); }}
            className="text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {state.newsLoading && state.newsArticles.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Newspaper className="w-8 h-8 opacity-30" />
            <p className="text-sm">No articles match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleArticles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                isLiked={isArticleLiked(state.likedArticleIds, article.id)}
                onSelect={handleSelectArticle}
                onLike={handleToggleLike}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
