import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { computeSentimentBreakdown } from "@/lib/newsAggregations";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NewsArticle } from "@/lib/types";
import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { CollapsibleSection } from "./CollapsibleSection";

interface SentimentOverviewProps {
  articles: NewsArticle[];
  onAskAI?: (question: string) => void;
}

const SENTIMENT_CHART_CONFIG: ChartConfig = {
  positive: { label: "Positive", color: "#22c55e" },
  neutral: { label: "Neutral", color: "#eab308" },
  negative: { label: "Negative", color: "#ef4444" },
};

function buildPieData(articles: NewsArticle[]) {
  const { positive, neutral, negative } = computeSentimentBreakdown(articles);
  return [
    { name: "Positive", value: positive },
    { name: "Neutral", value: neutral },
    { name: "Negative", value: negative },
  ].filter((d) => d.value > 0);
}

function buildCategoryBarData(articles: NewsArticle[]) {
  const categoryMap = new Map<string, { positive: number; neutral: number; negative: number }>();
  for (const article of articles) {
    const cat = article.category ?? "other";
    const existing = categoryMap.get(cat) ?? { positive: 0, neutral: 0, negative: 0 };
    const sentiment = article.sentiment ?? "neutral";
    existing[sentiment]++;
    categoryMap.set(cat, existing);
  }
  return Array.from(categoryMap.entries()).map(([category, counts]) => ({ category, ...counts }));
}

function SentimentBar({ articles }: { articles: NewsArticle[] }) {
  const { positive, neutral, negative } = computeSentimentBreakdown(articles);
  const total = positive + neutral + negative;
  if (total === 0) return <p className="text-sm text-muted-foreground">No articles yet.</p>;
  const positivePercent = Math.round((positive / total) * 100);
  const neutralPercent = Math.round((neutral / total) * 100);
  const negativePercent = 100 - positivePercent - neutralPercent;

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden gap-px">
        <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${positivePercent}%` }} />
        <div className="bg-yellow-400 transition-all duration-500" style={{ width: `${neutralPercent}%` }} />
        <div className="bg-red-500 transition-all duration-500" style={{ width: `${negativePercent}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-emerald-600 font-medium">{positivePercent}% positive</span>
        <span className="text-yellow-600 font-medium">{neutralPercent}% neutral</span>
        <span className="text-red-600 font-medium">{negativePercent}% negative</span>
      </div>
    </div>
  );
}

export function SentimentOverview({ articles, onAskAI }: SentimentOverviewProps) {
  const pieData = buildPieData(articles);
  const barData = buildCategoryBarData(articles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sentiment Overview</CardTitle>
        <p className="text-xs text-muted-foreground">How citizens feel about this week's news</p>
      </CardHeader>
      <CardContent>
        <button
          onClick={() => onAskAI?.("Give me the full city-wide sentiment summary with breakdown by category")}
          className="w-full text-left hover:opacity-80 transition-opacity"
        >
          <SentimentBar articles={articles} />
        </button>
        <CollapsibleSection title="Detailed Charts">
          <div className="space-y-4">
            <ChartContainer config={SENTIMENT_CHART_CONFIG} className="h-[160px]">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={getSentimentColor(entry.name.toLowerCase())} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [value, name]} />
              </PieChart>
            </ChartContainer>
            {barData.length > 0 && (
              <ChartContainer config={SENTIMENT_CHART_CONFIG} className="h-[160px]">
                <BarChart data={barData}>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="positive" fill="#22c55e" stackId="a" />
                  <Bar dataKey="neutral" fill="#eab308" stackId="a" />
                  <Bar dataKey="negative" fill="#ef4444" stackId="a" />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
