import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NeighborhoodActivity } from "@/lib/types";

interface HotSpotsPanelProps {
  neighborhoods: NeighborhoodActivity[];
}

const RANK_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "1st", color: "#f59e0b" },
  1: { label: "2nd", color: "#94a3b8" },
  2: { label: "3rd", color: "#cd7c3e" },
};

function computeEngagementTotal(hood: NeighborhoodActivity): number {
  return hood.reactionCount + hood.commentCount * 3;
}

function buildEngagementBarWidth(engagement: number, maxEngagement: number): string {
  if (maxEngagement === 0) return "0%";
  return `${Math.round((engagement / maxEngagement) * 100)}%`;
}

function NeighborhoodRow({
  neighborhood,
  rank,
  maxEngagement,
}: {
  neighborhood: NeighborhoodActivity;
  rank: number;
  maxEngagement: number;
}) {
  const engagement = computeEngagementTotal(neighborhood);
  const barWidth = buildEngagementBarWidth(engagement, maxEngagement);
  const rankMeta = RANK_LABELS[rank];
  const sentimentColor = getSentimentColor(neighborhood.topSentiment);

  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2 min-h-[44px]">
        {rankMeta && (
          <span
            className="text-xs font-bold w-8 shrink-0"
            style={{ color: rankMeta.color }}
          >
            {rankMeta.label}
          </span>
        )}
        {!rankMeta && (
          <span className="text-xs text-muted-foreground w-8 shrink-0">{rank + 1}th</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {neighborhood.name}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {neighborhood.articleCount} articles · {neighborhood.reactionCount} reactions
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: barWidth, backgroundColor: sentimentColor }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

export function HotSpotsPanel({ neighborhoods }: HotSpotsPanelProps) {
  const topNeighborhoods = neighborhoods.slice(0, 8);
  const maxEngagement = Math.max(
    ...topNeighborhoods.map(computeEngagementTotal),
    1,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Neighborhood Hot Spots</CardTitle>
      </CardHeader>
      <CardContent>
        {topNeighborhoods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No neighborhood data yet.</p>
        ) : (
          <ul className="space-y-2">
            {topNeighborhoods.map((hood, index) => (
              <NeighborhoodRow
                key={hood.name}
                neighborhood={hood}
                rank={index}
                maxEngagement={maxEngagement}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
