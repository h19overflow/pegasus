import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ANALYSIS_API_BASE } from "@/lib/apiConfig";
import { CollapsibleSection } from "./CollapsibleSection";

interface ArticleAnalysis {
  article_id: string;
  article_sentiment: "positive" | "neutral" | "negative";
  admin_summary: string;
  topic_clusters: string[];
  urgent_concerns: string[];
  comments: { comment_id: string; sentiment: string }[];
}

interface AnalysisResults {
  articles: ArticleAnalysis[];
}

interface RankedItem {
  label: string;
  count: number;
}

interface AggregatedInsights {
  topConcern: string;
  trendingTopic: string;
  keySentiment: string;
  topicClusters: RankedItem[];
  urgentConcerns: RankedItem[];
}

interface AIInsightsCardProps {
  refreshTrigger?: number;
  onAskAI?: (question: string) => void;
}

type FetchState = "loading" | "empty" | "ready" | "error";

const MAX_TOPICS = 12;
const MAX_CONCERNS = 8;

async function fetchAnalysisResults(): Promise<AnalysisResults | null> {
  const response = await fetch(`${ANALYSIS_API_BASE}/api/analysis/results`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load results: ${response.status}`);
  return response.json();
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(text: string): Set<string> {
  const stopWords = new Set(["the", "a", "an", "in", "of", "and", "for", "on", "at", "to", "with", "is", "are", "was", "were"]);
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w)),
  );
}

function computeTokenOverlap(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) shared++;
  }
  const smaller = Math.min(tokensA.size, tokensB.size);
  return shared / smaller;
}

function deduplicateAndRank(items: string[], maxResults: number): RankedItem[] {
  const normalized = items.map((item) => ({
    original: item.trim(),
    key: normalizeText(item),
    tokens: tokenize(item),
  }));

  // Group by normalized key first (exact dedup after lowercasing)
  const groups = new Map<string, { label: string; count: number; tokens: Set<string> }>();
  for (const item of normalized) {
    const existing = groups.get(item.key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(item.key, { label: item.original, count: 1, tokens: item.tokens });
    }
  }

  // Fuzzy merge: if one group's tokens overlap >60% with another, merge into the higher-count one
  const entries = [...groups.values()].sort((a, b) => b.count - a.count);
  const merged: { label: string; count: number; tokens: Set<string> }[] = [];

  for (const entry of entries) {
    let wasMerged = false;
    for (const target of merged) {
      if (computeTokenOverlap(entry.tokens, target.tokens) > 0.6) {
        target.count += entry.count;
        wasMerged = true;
        break;
      }
    }
    if (!wasMerged) {
      merged.push({ ...entry });
    }
  }

  return merged
    .sort((a, b) => b.count - a.count)
    .slice(0, maxResults)
    .map(({ label, count }) => ({ label, count }));
}

function aggregateInsights(results: AnalysisResults): AggregatedInsights {
  const allConcerns = results.articles.flatMap((a) => a.urgent_concerns);
  const allTopics = results.articles.flatMap((a) => a.topic_clusters);

  const rankedTopics = deduplicateAndRank(allTopics, MAX_TOPICS);
  const rankedConcerns = deduplicateAndRank(allConcerns, MAX_CONCERNS);

  const topConcern = rankedConcerns[0]?.label ?? "No concerns flagged";
  const trendingTopic = rankedTopics[0]?.label ?? "No topics yet";
  const negativePct = Math.round(
    (results.articles.filter((a) => a.article_sentiment === "negative").length / Math.max(results.articles.length, 1)) * 100,
  );
  const keySentiment = `${negativePct}% of stories have negative reactions this week`;

  return { topConcern, trendingTopic, keySentiment, topicClusters: rankedTopics, urgentConcerns: rankedConcerns };
}

function InsightBullet({ text, question, onAskAI }: { text: string; question: string; onAskAI?: (q: string) => void }) {
  return (
    <li>
      <button
        onClick={() => onAskAI?.(question)}
        className="text-sm text-left text-foreground hover:text-primary transition-colors leading-snug underline-offset-2 hover:underline w-full"
      >
        {text}
      </button>
    </li>
  );
}

export function AIInsightsCard({ refreshTrigger = 0, onAskAI }: AIInsightsCardProps) {
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const [insights, setInsights] = useState<AggregatedInsights | null>(null);

  useEffect(() => {
    setFetchState("loading");
    fetchAnalysisResults()
      .then((data) => {
        setInsights(data ? aggregateInsights(data) : null);
        setFetchState(data ? "ready" : "empty");
      })
      .catch((error) => {
        console.error("[AIInsightsCard] Failed to fetch analysis results:", error);
        setFetchState("error");
      });
  }, [refreshTrigger]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Key Takeaways</CardTitle>
      </CardHeader>
      <CardContent>
        {fetchState === "loading" && <p className="text-sm text-muted-foreground animate-pulse">Loading insights…</p>}
        {fetchState === "empty" && <p className="text-sm text-muted-foreground">No analysis yet. Run Analysis to generate insights.</p>}
        {fetchState === "error" && <p className="text-sm text-destructive">Failed to load. Check that the backend is running.</p>}
        {fetchState === "ready" && insights && (
          <>
            <ul className="space-y-3">
              <InsightBullet text={`Top concern: ${insights.topConcern}`} question={`Tell me more about: ${insights.topConcern}`} onAskAI={onAskAI} />
              <InsightBullet text={`Trending: ${insights.trendingTopic}`} question={`What's happening with ${insights.trendingTopic}?`} onAskAI={onAskAI} />
              <InsightBullet text={insights.keySentiment} question="Give me the full city-wide sentiment summary" onAskAI={onAskAI} />
            </ul>
            <CollapsibleSection title="See Details">
              {insights.topicClusters.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Main Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.topicClusters.map(({ label, count }) => (
                      <span key={label} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {label}{count > 1 && <span className="ml-1 opacity-60">×{count}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {insights.urgentConcerns.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Needs Attention</p>
                  <ul className="space-y-1.5">
                    {insights.urgentConcerns.map(({ label, count }) => (
                      <li key={label} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1 shrink-0">•</span>
                        <button
                          onClick={() => onAskAI?.(`Tell me more about: ${label}`)}
                          className="text-sm text-left text-foreground hover:text-primary transition-colors leading-snug"
                        >
                          {label}
                          {count > 1 && <span className="ml-1 text-xs text-muted-foreground">(×{count})</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleSection>
          </>
        )}
      </CardContent>
    </Card>
  );
}
