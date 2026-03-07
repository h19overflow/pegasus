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

interface AggregatedInsights {
  topConcern: string;
  trendingTopic: string;
  keySentiment: string;
  topicClusters: string[];
  urgentConcerns: string[];
}

interface AIInsightsCardProps {
  refreshTrigger?: number;
  onAskAI?: (question: string) => void;
}

type FetchState = "loading" | "empty" | "ready" | "error";

async function fetchAnalysisResults(): Promise<AnalysisResults | null> {
  const response = await fetch(`${ANALYSIS_API_BASE}/api/analysis/results`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load results: ${response.status}`);
  return response.json();
}

function rankByFrequency(items: string[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item);
}

function aggregateInsights(results: AnalysisResults): AggregatedInsights {
  const allConcerns = results.articles.flatMap((a) => a.urgent_concerns);
  const allTopics = results.articles.flatMap((a) => a.topic_clusters);

  const rankedConcerns = rankByFrequency(allConcerns);
  const rankedTopics = rankByFrequency(allTopics);

  const topConcern = rankedConcerns[0] ?? "No concerns flagged";
  const trendingTopic = rankedTopics[0] ?? "No topics yet";
  const negativePct = Math.round(
    (results.articles.filter((a) => a.article_sentiment === "negative").length / Math.max(results.articles.length, 1)) * 100,
  );
  const keySentiment = `${negativePct}% of articles have negative sentiment this week`;
  const topicClusters = [...new Set(allTopics)];
  const urgentConcerns = [...new Set(allConcerns)];
  return { topConcern, trendingTopic, keySentiment, topicClusters, urgentConcerns };
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
        <CardTitle className="text-base">AI Quick Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {fetchState === "loading" && <p className="text-sm text-muted-foreground animate-pulse">Loading insights…</p>}
        {fetchState === "empty" && <p className="text-sm text-muted-foreground">No analysis yet. Run AI Analysis to generate insights.</p>}
        {fetchState === "error" && <p className="text-sm text-destructive">Failed to load. Check that the backend is running.</p>}
        {fetchState === "ready" && insights && (
          <>
            <ul className="space-y-3">
              <InsightBullet text={`Top concern: ${insights.topConcern}`} question={`Tell me more about: ${insights.topConcern}`} onAskAI={onAskAI} />
              <InsightBullet text={`Trending: ${insights.trendingTopic}`} question={`What's happening with ${insights.trendingTopic}?`} onAskAI={onAskAI} />
              <InsightBullet text={insights.keySentiment} question="Give me the full city-wide sentiment summary" onAskAI={onAskAI} />
            </ul>
            <CollapsibleSection title="See full analysis">
              {insights.topicClusters.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Topic Clusters</p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.topicClusters.map((topic) => (
                      <span key={topic} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{topic}</span>
                    ))}
                  </div>
                </div>
              )}
              {insights.urgentConcerns.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Urgent Concerns</p>
                  <ul className="space-y-1 list-disc list-inside">
                    {insights.urgentConcerns.map((concern) => (
                      <li key={concern} className="text-sm text-foreground">{concern}</li>
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
