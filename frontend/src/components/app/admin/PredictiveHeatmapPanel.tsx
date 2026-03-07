import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchHotspots, fetchTrends } from "@/lib/predictiveService";
import type { PredictionHotspot, PredictionTrend } from "@/lib/types";
import { CollapsibleSection } from "./CollapsibleSection";

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

const RISK_ICONS: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

const TREND_ICONS: Record<string, string> = {
  rising: "📈",
  falling: "📉",
  stable: "➡️",
};

function HotspotRow({ hotspot }: { hotspot: PredictionHotspot }) {
  const color = RISK_COLORS[hotspot.risk_level] || "#888";
  const icon = RISK_ICONS[hotspot.risk_level] || "⚪";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-border/30 hover:border-border/60 transition-colors">
      <span className="text-sm">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {hotspot.neighborhood}
        </div>
        <div className="text-xs text-muted-foreground">
          {hotspot.category} · {hotspot.trend_direction}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold tabular-nums" style={{ color }}>
          {Math.round(hotspot.hotspot_score)}
        </div>
        <div
          className="text-[10px] font-semibold uppercase"
          style={{ color }}
        >
          {hotspot.risk_level}
        </div>
      </div>
    </div>
  );
}

function TrendRow({ trend }: { trend: PredictionTrend }) {
  const icon = TREND_ICONS[trend.trend_direction] || "➡️";
  const growthPercent = Math.round(trend.growth_rate * 100);
  const growthColor = trend.growth_rate > 0 ? "#dc2626" : trend.growth_rate < 0 ? "#16a34a" : "#888";

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-border/30">
      <span className="text-sm">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground capitalize">{trend.category}</div>
        <div className="text-xs text-muted-foreground truncate">
          {trend.top_neighborhoods.slice(0, 3).join(", ")}
        </div>
      </div>
      <div className="text-sm font-bold tabular-nums" style={{ color: growthColor }}>
        {growthPercent > 0 ? "+" : ""}{growthPercent}%
      </div>
    </div>
  );
}

export function PredictiveHeatmapPanel() {
  const [hotspots, setHotspots] = useState<PredictionHotspot[]>([]);
  const [trends, setTrends] = useState<PredictionTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchHotspots(), fetchTrends()]).then(([hotspotsData, trendsData]) => {
      if (hotspotsData) setHotspots(hotspotsData.hotspots);
      if (trendsData) setTrends(trendsData.trends);
      setLoading(false);
    });
  }, []);

  const criticalCount = hotspots.filter((h) => h.risk_level === "critical").length;
  const highCount = hotspots.filter((h) => h.risk_level === "high").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Predictive Hotspots
          {criticalCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              {highCount} high
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading predictions...</p>
        ) : hotspots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hotspot data available.</p>
        ) : (
          <>
            <div className="space-y-2">
              {hotspots.slice(0, 5).map((h) => (
                <HotspotRow key={h.area_id} hotspot={h} />
              ))}
            </div>

            {hotspots.length > 5 && (
              <CollapsibleSection title={`All Hotspots (${hotspots.length})`} defaultOpen={false}>
                <div className="space-y-2">
                  {hotspots.slice(5).map((h) => (
                    <HotspotRow key={h.area_id} hotspot={h} />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {trends.length > 0 && (
              <CollapsibleSection title="Trend Analysis" defaultOpen={false}>
                <div className="space-y-2">
                  {trends.map((t) => (
                    <TrendRow key={t.category} trend={t} />
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
