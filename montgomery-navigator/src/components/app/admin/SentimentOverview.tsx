import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { computeSentimentBreakdown } from "@/lib/newsAggregations";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NewsArticle } from "@/lib/types";
import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";

interface SentimentOverviewProps {
  articles: NewsArticle[];
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
  return Array.from(categoryMap.entries()).map(([category, counts]) => ({
    category,
    ...counts,
  }));
}

export function SentimentOverview({ articles }: SentimentOverviewProps) {
  const pieData = buildPieData(articles);
  const barData = buildCategoryBarData(articles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sentiment Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Overall Sentiment</p>
          <ChartContainer config={SENTIMENT_CHART_CONFIG} className="h-[180px]">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={getSentimentColor(entry.name.toLowerCase())}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
              />
            </PieChart>
          </ChartContainer>
        </div>

        {barData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Sentiment by Category</p>
            <ChartContainer config={SENTIMENT_CHART_CONFIG} className="h-[180px]">
              <BarChart data={barData}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="positive" fill="#22c55e" stackId="a" />
                <Bar dataKey="neutral" fill="#eab308" stackId="a" />
                <Bar dataKey="negative" fill="#ef4444" stackId="a" />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
