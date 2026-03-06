import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCommentStore } from "@/stores/adminCommentStore";
import { computeNeighborhoodActivity, computeSentimentBreakdown, findTopConcerns } from "@/lib/newsAggregations";
import type { NeighborhoodActivity, NewsArticle, NewsComment, ReactionType } from "@/lib/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface MayorsBriefProps {
  articles: NewsArticle[];
  comments: NewsComment[];
  reactions: Record<string, Record<ReactionType, number>>;
  onAskAI?: (question: string) => void;
}

function buildSentimentSummary(articles: NewsArticle[]): string {
  const { positive, neutral, negative } = computeSentimentBreakdown(articles);
  const total = positive + neutral + negative;
  if (total === 0) return "No articles this week.";
  const positivePercent = Math.round((positive / total) * 100);
  const negativePercent = Math.round((negative / total) * 100);
  if (positivePercent >= 50) return `Mostly positive this week — ${positivePercent}% of stories are encouraging.`;
  if (negativePercent >= 50) return `Mostly negative this week — ${negativePercent}% of stories are concerning.`;
  return `Mixed sentiment this week: ${positivePercent}% positive, ${negativePercent}% negative.`;
}

function ClickableItem({ text, question, onAskAI }: { text: string; question: string; onAskAI?: (q: string) => void }) {
  if (!onAskAI) return <span className="text-sm text-foreground leading-snug">{text}</span>;
  return (
    <button
      onClick={() => onAskAI(question)}
      className="text-sm text-left text-foreground leading-snug hover:text-primary transition-colors group flex items-center gap-1.5"
    >
      {text}
      <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </button>
  );
}

function TopConcernsList({ articles, comments, onAskAI }: { articles: NewsArticle[]; comments: NewsComment[]; onAskAI?: (q: string) => void }) {
  const topConcerns = findTopConcerns(articles, comments).slice(0, 3);
  if (topConcerns.length === 0) return <p className="text-sm text-muted-foreground">No citizen comments yet.</p>;
  return (
    <ul className="space-y-2">
      {topConcerns.map((concern) => (
        <li key={concern.articleId} className="flex items-start justify-between gap-2">
          <ClickableItem
            text={concern.title}
            question={`Tell me more about: ${concern.title}`}
            onAskAI={onAskAI}
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">{concern.commentCount} comments</span>
        </li>
      ))}
    </ul>
  );
}

function NeighborhoodList({ neighborhoods, onAskAI }: { neighborhoods: NeighborhoodActivity[]; onAskAI?: (q: string) => void }) {
  const top = neighborhoods.slice(0, 3);
  if (top.length === 0) return <p className="text-sm text-muted-foreground">No neighborhood data yet.</p>;
  return (
    <ul className="space-y-2">
      {top.map((hood) => (
        <li key={hood.name} className="flex items-center justify-between">
          <ClickableItem
            text={hood.name}
            question={`How does ${hood.name} feel? What are the main concerns there?`}
            onAskAI={onAskAI}
          />
          <span className="text-xs text-muted-foreground">
            {hood.articleCount} articles · {hood.reactionCount + hood.commentCount} engagements
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MayorsBrief({ articles, comments: propComments, reactions, onAskAI }: MayorsBriefProps) {
  const { fetchComments, mergeWithLocal } = useAdminCommentStore();

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const allComments = mergeWithLocal(propComments);
  const neighborhoods = computeNeighborhoodActivity(articles, reactions, allComments);
  const sentimentSummary = buildSentimentSummary(articles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mayor's Brief</CardTitle>
        <p className="text-xs text-muted-foreground">Your daily briefing on citizen sentiment</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          onClick={() => onAskAI?.("Give me the full city-wide sentiment summary")}
          className="w-full text-left px-3 py-2.5 rounded-lg bg-muted/50 border border-border hover:border-primary/30 hover:bg-muted/70 transition-colors group"
        >
          <p className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">{sentimentSummary}</p>
        </button>
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Top 3 Concerns</h3>
          <TopConcernsList articles={articles} comments={allComments} onAskAI={onAskAI} />
        </section>
        <CollapsibleSection title="Most Discussed Neighborhoods" defaultOpen={false}>
          <NeighborhoodList neighborhoods={neighborhoods} onAskAI={onAskAI} />
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
