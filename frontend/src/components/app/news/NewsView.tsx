import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles, filterArticlesByCategory } from "@/lib/newsService";
import { NewsCard } from "./NewsCard";
import { NewsDetail } from "./NewsDetail";
import { NewsCategoryTabs } from "./NewsCategoryTabs";
import { NewsFilterBar } from "./NewsFilterBar";
import { sortArticles, buildArticleCountsPerCategory } from "./newsletterHelpers";
import type { SortMode } from "./newsletterHelpers";
import type { NewsArticle, NewsCategory } from "@/lib/types";
import { Newspaper } from "lucide-react";


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

export function NewsView() {
  const { state, dispatch } = useApp();
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"" | "positive" | "negative" | "neutral">("");

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

  function handleReact(articleId: string, emoji: string | null) {
    if (emoji === null) {
      const current = state.articleReactions[articleId];
      if (current) dispatch({ type: "SET_EMOJI_REACTION", articleId, emoji: current });
    } else {
      dispatch({ type: "SET_EMOJI_REACTION", articleId, emoji });
    }
  }

  function handleFlag(articleId: string) {
    dispatch({ type: "TOGGLE_ARTICLE_FLAG", articleId });
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

  // Apply filters + sort
  const afterCategory = filterArticlesByCategory(state.newsArticles, state.newsCategory);
  const afterSentiment = filterBySentiment(afterCategory, sentimentFilter);
  const afterSource = filterBySource(afterSentiment, sourceFilter);
  const afterSearch = filterBySearch(afterSource, searchQuery);
  const visibleArticles = sortArticles(afterSearch, sortMode, state.newsComments);
  const articleCounts = buildArticleCountsPerCategory(state.newsArticles);

  const liveCommentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of state.newsComments) {
      counts.set(c.articleId, (counts.get(c.articleId) ?? 0) + 1);
    }
    return counts;
  }, [state.newsComments]);

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
                reactionCounts={article.reactionCounts ?? {}}
                userReaction={state.articleReactions[article.id] ?? null}
                flagCount={article.flagCount ?? 0}
                isFlagged={state.flaggedArticleIds.includes(article.id)}
                commentCount={article.commentCount + (liveCommentCounts.get(article.id) ?? 0)}
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
