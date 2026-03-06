import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeNeighborhoodActivity, computeSentimentBreakdown, findTopConcerns } from "@/lib/newsAggregations";
import type { NeighborhoodActivity, NewsArticle, NewsComment, ReactionType } from "@/lib/types";

interface MayorsBriefProps {
  articles: NewsArticle[];
  comments: NewsComment[];
  reactions: Record<string, Record<ReactionType, number>>;
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

function TopConcernsList({ articles, comments }: { articles: NewsArticle[]; comments: NewsComment[] }) {
  const topConcerns = findTopConcerns(articles, comments).slice(0, 3);
  if (topConcerns.length === 0) {
    return <p className="text-sm text-muted-foreground">No comments yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {topConcerns.map((concern) => (
        <li key={concern.articleId} className="flex items-start justify-between gap-2">
          <span className="text-sm text-foreground leading-snug line-clamp-2 flex-1">
            {concern.title}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
            {concern.commentCount} comments
          </span>
        </li>
      ))}
    </ul>
  );
}

function NeighborhoodList({ neighborhoods }: { neighborhoods: NeighborhoodActivity[] }) {
  const top = neighborhoods.slice(0, 3);
  if (top.length === 0) {
    return <p className="text-sm text-muted-foreground">No neighborhood data yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {top.map((hood) => (
        <li key={hood.name} className="flex items-center justify-between">
          <span className="text-sm text-foreground">{hood.name}</span>
          <span className="text-xs text-muted-foreground">
            {hood.articleCount} articles · {hood.reactionCount + hood.commentCount} engagements
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MayorsBrief({ articles, comments, reactions }: MayorsBriefProps) {
  const neighborhoods = computeNeighborhoodActivity(articles, reactions, comments);
  const sentimentSummary = buildSentimentSummary(articles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mayor's Brief</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Top 3 Concerns</h3>
          <TopConcernsList articles={articles} comments={comments} />
        </section>
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Most Discussed Neighborhoods</h3>
          <NeighborhoodList neighborhoods={neighborhoods} />
        </section>
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-1">Sentiment This Week</h3>
          <p className="text-sm text-muted-foreground">{sentimentSummary}</p>
        </section>
      </CardContent>
    </Card>
  );
}
