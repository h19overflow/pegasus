import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles, filterArticlesByCategory, sortArticlesByDate } from "@/lib/newsService";
import { NewsCard } from "./NewsCard";
import { NewsDetail } from "./NewsDetail";
import { NewsCategoryTabs } from "./NewsCategoryTabs";
import { NewsFilterBar } from "./NewsFilterBar";
import { NewsMapView } from "./NewsMapView";
import type { NewsArticle, NewsCategory } from "@/lib/types";
import { Map, Newspaper, RefreshCw } from "lucide-react";
import { scrapeLatestNews } from "@/integrations/brightdata/newsScraper";
import { BrightDataError } from "@/integrations/brightdata/brightdataClient";
import { runMisinfoAnalysis } from "@/integrations/misinfo/misinfoService";
import { NEWS_MAP_CATEGORIES } from "@/lib/newsMapUtils";

type SortMode = "newest" | "oldest" | "most_liked";
const NEWS_CACHE_KEY = "montgomeryai_news_articles";
const NEWS_LAST_SCRAPED_KEY = "montgomeryai_news_last_scraped";

function loadCachedNewsArticles(): NewsArticle[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as NewsArticle[] : [];
  } catch {
    return [];
  }
}

function loadCachedLastScraped(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(NEWS_LAST_SCRAPED_KEY);
}

function persistNewsCache(articles: NewsArticle[], scrapedAt: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(articles));
    if (scrapedAt) {
      localStorage.setItem(NEWS_LAST_SCRAPED_KEY, scrapedAt);
    }
  } catch {
    // no-op: ignore storage quota / private mode failures
  }
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

function filterBySentiment(articles: NewsArticle[], sentiment: string): NewsArticle[] {
  if (!sentiment) return articles;
  return articles.filter((a) => a.sentiment === sentiment);
}

function filterByFlagged(articles: NewsArticle[], flaggedOnly: boolean, flaggedIds: string[]): NewsArticle[] {
  if (!flaggedOnly) return articles;
  return articles.filter((a) => flaggedIds.includes(a.id) || (a.misinfoRisk != null && a.misinfoRisk > 30));
}

export function NewsView() {
  const { state, dispatch } = useApp();
  const analyzedArticleIdsRef = useRef<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"feed" | "map">("feed");
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"" | "positive" | "negative" | "neutral">("");
  const [mapActiveCategories, setMapActiveCategories] = useState<Set<string>>(
    () => new Set(NEWS_MAP_CATEGORIES.map((category) => category.id)),
  );
  const [mapMisinfoOnly, setMapMisinfoOnly] = useState(false);

  async function loadArticles() {
    dispatch({ type: "SET_NEWS_LOADING", loading: true });
    try {
      const cachedArticles = loadCachedNewsArticles();
      const articles = cachedArticles.length > 0 ? cachedArticles : await fetchNewsArticles();
      dispatch({ type: "SET_NEWS_ARTICLES", articles });

      if (!lastScraped) {
        const cachedScraped = loadCachedLastScraped();
        if (cachedScraped) {
          setLastScraped(cachedScraped);
        } else {
          const response = await fetch("/data/news_feed.json");
          const data = await response.json();
          if (data.lastScraped) {
            setLastScraped(data.lastScraped);
          } else {
            // Fall back to the most recent scrapedAt across all articles
            const latest = articles.reduce<string | null>(
              (max, a) => (!max || a.scrapedAt > max ? a.scrapedAt : max),
              null,
            );
            if (latest) setLastScraped(latest);
          }
        }
      }
    } catch (error) {
      console.error("[NewsView] Failed to load news articles", error);
    } finally {
      dispatch({ type: "SET_NEWS_LOADING", loading: false });
    }
  }

  useEffect(() => { loadArticles(); }, []);

  useEffect(() => {
    const pending = state.newsArticles.filter(
      (article) => article.misinfoRisk == null && !analyzedArticleIdsRef.current.has(article.id),
    );
    if (pending.length === 0) return;

    pending.forEach((article) => analyzedArticleIdsRef.current.add(article.id));
    runMisinfoAnalysis(pending, (scores) =>
      dispatch({ type: "UPDATE_MISINFO_SCORES", scores }),
    );
  }, [dispatch, state.newsArticles]);

  useEffect(() => {
    if (state.newsArticles.length === 0) return;
    persistNewsCache(state.newsArticles, lastScraped);
  }, [lastScraped, state.newsArticles]);

  function handleCategoryChange(category: NewsCategory) {
    dispatch({ type: "SET_NEWS_CATEGORY", category });
  }

  function handleSelectArticle(article: NewsArticle) {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: article.id });
  }

  function handleBackToFeed() {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
  }

  function handleReact(articleId: string, emoji: string | null) {
    dispatch({ type: "SET_ARTICLE_REACTION", articleId, emoji });
  }

  function handleFlag(articleId: string) {
    dispatch({ type: "TOGGLE_ARTICLE_FLAG", articleId });
  }

  function handleMapCategoryToggle(categoryId: string) {
    setMapActiveCategories((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  function handleMapMisinfoToggle() {
    setMapMisinfoOnly((previous) => !previous);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh = await scrapeLatestNews();
      // User-triggered refresh should fully reload the feed with fresh results.
      dispatch({ type: "SET_NEWS_ARTICLES", articles: fresh });
      setLastScraped(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof BrightDataError ? err.message : "Refresh failed. Check your API key.";
      setRefreshError(msg);
      console.error("[NewsView] Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
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
        userReaction={state.articleReactions[selectedArticle.id] ?? null}
        isFlagged={state.flaggedArticleIds.includes(selectedArticle.id)}
        onBack={handleBackToFeed}
        onReact={handleReact}
        onFlag={handleFlag}
      />
    );
  }

  if (viewMode === "map") {
    return (
      <NewsMapView
        articles={state.newsArticles}
        flaggedArticleIds={state.flaggedArticleIds}
        activeCategories={mapActiveCategories}
        misinfoOnly={mapMisinfoOnly}
        onToggleCategory={handleMapCategoryToggle}
        onToggleMisinfoOnly={handleMapMisinfoToggle}
        onBack={() => setViewMode("feed")}
        onSelectArticle={handleSelectArticle}
      />
    );
  }

  // Apply filters + sort
  const afterCategory = filterArticlesByCategory(state.newsArticles, state.newsCategory);
  const afterSentiment = filterBySentiment(afterCategory, sentimentFilter);
  const afterSource = filterBySource(afterSentiment, sourceFilter);
  const afterSearch = filterBySearch(afterSource, searchQuery);
  const afterFlagged = filterByFlagged(afterSearch, showFlaggedOnly, state.flaggedArticleIds);
  const visibleArticles = sortArticles(afterFlagged, sortMode);
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
          <div className="flex items-start gap-2">
            <button
              onClick={() => setViewMode("map")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-white text-sm font-medium text-foreground hover:shadow-md transition-all"
            >
              <Map className="w-4 h-4 text-primary" />
              View on map
            </button>
            <div className="flex flex-col items-end gap-1 min-h-[16px]">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-white text-sm font-medium text-foreground hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh news"}
              </button>
              {lastScraped && !refreshError && (
                <span className="text-[11px] text-muted-foreground">
                  Updated {formatLastScrapedTimestamp(lastScraped)}
                </span>
              )}
              {refreshError && (
                <span className="text-[11px] text-destructive leading-tight text-right max-w-[220px]">
                  {refreshError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <NewsCategoryTabs
          activeCategory={state.newsCategory}
          onCategoryChange={handleCategoryChange}
          articleCounts={articleCounts}
        />

        <NewsFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortMode={sortMode}
          onSortChange={setSortMode}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          uniqueSources={uniqueSources}
          sentimentFilter={sentimentFilter}
          onSentimentChange={setSentimentFilter}
          showFlaggedOnly={showFlaggedOnly}
          onFlaggedChange={setShowFlaggedOnly}
        />
      </div>

      {/* Results count */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-muted/20 border-b border-border/30">
        <span className="text-xs text-muted-foreground">
          {visibleArticles.length} article{visibleArticles.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
          {sourceFilter && ` from ${sourceFilter}`}
        </span>
        {(searchQuery || sourceFilter || sentimentFilter) && (
          <button
            onClick={() => { setSearchQuery(""); setSourceFilter(""); setSentimentFilter(""); }}
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
                userReaction={state.articleReactions[article.id] ?? null}
                isFlagged={state.flaggedArticleIds.includes(article.id)}
                onSelect={handleSelectArticle}
                onReact={handleReact}
                onFlag={handleFlag}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
