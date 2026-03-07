import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles, fetchNewsComments, filterArticlesByCategory } from "@/lib/newsService";
import { loadStoredComments } from "@/lib/newsCommentStore";
import { runMisinfoAnalysis } from "@/lib/misinfo/misinfoService";
import { NewsCard } from "./NewsCard";
import { NewsDetail } from "./NewsDetail";
import { HeroArticle } from "./HeroArticle";
import { NewsletterHeader } from "./NewsletterHeader";
import { NewsMapPreview } from "./NewsMapPreview";
import { buildArticleCountsPerCategory, sortArticles, filterBySearch, selectHeroArticle } from "./newsletterHelpers";
import type { SortMode } from "./newsletterHelpers";
import { MapPin, Newspaper } from "lucide-react";

async function loadNewsComments(dispatch: (action: { type: string; comments: import("@/lib/types").NewsComment[] }) => void) {
  const [seeded, stored] = await Promise.all([fetchNewsComments(), Promise.resolve(loadStoredComments())]);
  const seen = new Set<string>();
  const merged = [...seeded, ...stored].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  if (merged.length > 0) {
    dispatch({ type: "SET_NEWS_COMMENTS", comments: merged });
  }
}

function SkeletonHero() {
  return <div className="animate-pulse rounded-2xl bg-muted h-[280px] w-full" />;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-background p-4 flex flex-col gap-3">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
    </div>
  );
}

interface NewsletterTabProps {
  onShowMap?: () => void;
}

export function NewsletterTab({ onShowMap }: NewsletterTabProps) {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const misinfoRanRef = useRef(false);

  useEffect(() => {
    if (state.newsArticles.length === 0 && !state.newsLoading) {
      dispatch({ type: "SET_NEWS_LOADING", loading: true });
      fetchNewsArticles()
        .then((articles) => dispatch({ type: "SET_NEWS_ARTICLES", articles }))
        .catch((err) => console.error("[NewsletterTab] Failed to load articles", err))
        .finally(() => dispatch({ type: "SET_NEWS_LOADING", loading: false }));
    }

    if (state.newsComments.length === 0) {
      loadNewsComments(dispatch);
    }
  }, []);

  // Run misinfo analysis on articles that don't have scores yet
  useEffect(() => {
    const unscored = state.newsArticles.filter((a) => a.misinfoRisk == null);
    if (unscored.length === 0 || misinfoRanRef.current) return;
    misinfoRanRef.current = true;

    runMisinfoAnalysis(unscored, (scores) => {
      dispatch({ type: "UPDATE_MISINFO_SCORES", scores });
    });
  }, [state.newsArticles]);

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

  const selectedArticle = state.selectedArticleId
    ? state.newsArticles.find((a) => a.id === state.selectedArticleId) ?? null
    : null;

  if (selectedArticle) {
    return (
      <NewsDetail
        article={selectedArticle}
        userReaction={state.articleReactions[selectedArticle.id] ?? null}
        isFlagged={state.flaggedArticleIds.includes(selectedArticle.id)}
        onBack={() => dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null })}
        onReact={handleReact}
        onFlag={handleFlag}
      />
    );
  }

  const afterCategory = filterArticlesByCategory(state.newsArticles, state.newsCategory);
  const afterSearch = filterBySearch(afterCategory, searchQuery);
  const afterFlagged = showFlaggedOnly
    ? afterSearch.filter(
        (a) => state.flaggedArticleIds.includes(a.id) || (a.misinfoRisk ?? 0) > 60,
      )
    : afterSearch;
  const visibleArticles = sortArticles(afterFlagged, sortMode);
  const hero = selectHeroArticle(visibleArticles);
  const gridArticles = hero ? visibleArticles.filter((a) => a.id !== hero.id) : visibleArticles;
  const midpoint = Math.ceil(gridArticles.length / 2);
  const isLoading = state.newsLoading && state.newsArticles.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <NewsletterHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
        newsCategory={state.newsCategory}
        onCategoryChange={(cat) => dispatch({ type: "SET_NEWS_CATEGORY", category: cat })}
        articleCounts={buildArticleCountsPerCategory(state.newsArticles)}
        showFlaggedOnly={showFlaggedOnly}
        onFlaggedChange={setShowFlaggedOnly}
      />
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-4">
            <SkeletonHero />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Newspaper className="w-8 h-8 opacity-30" />
            <p className="text-sm">No articles match your filters</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {hero && (
              <HeroArticle article={hero} onSelect={(a) => dispatch({ type: "SET_SELECTED_ARTICLE", articleId: a.id })} />
            )}
            {gridArticles.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                  {gridArticles.slice(0, midpoint).map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      reactionCounts={article.reactionCounts ?? {}}
                      userReaction={state.articleReactions[article.id] ?? null}
                      flagCount={article.flagCount ?? 0}
                      isFlagged={state.flaggedArticleIds.includes(article.id)}
                      onSelect={(a) => dispatch({ type: "SET_SELECTED_ARTICLE", articleId: a.id })}
                      onReact={handleReact}
                      onFlag={handleFlag}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-4">
                  {onShowMap && (
                    <div className="flex flex-col gap-1.5">
                      <NewsMapPreview onShowMap={onShowMap} />
                      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
                        <MapPin className="w-3 h-3" />
                        Tap the map to explore news locations
                      </p>
                    </div>
                  )}
                  {gridArticles.slice(midpoint).map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      reactionCounts={article.reactionCounts ?? {}}
                      userReaction={state.articleReactions[article.id] ?? null}
                      flagCount={article.flagCount ?? 0}
                      isFlagged={state.flaggedArticleIds.includes(article.id)}
                      onSelect={(a) => dispatch({ type: "SET_SELECTED_ARTICLE", articleId: a.id })}
                      onReact={handleReact}
                      onFlag={handleFlag}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
