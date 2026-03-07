import L from "leaflet";
import type { NewsArticle } from "./types";

export const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

// ── Category metadata ──────────────────────────────────────────────────────
export const NEWS_MAP_CATEGORIES = [
  { id: "general",     label: "General",     symbol: "📰" },
  { id: "development", label: "Development", symbol: "🏗" },
  { id: "government",  label: "Government",  symbol: "🏛" },
  { id: "community",   label: "Community",   symbol: "🏘" },
  { id: "events",      label: "Events",      symbol: "🎉" },
] as const;

export const SENTIMENT_LEGEND = [
  { key: "positive", label: "Positive", color: "#16A34A" },
  { key: "negative", label: "Negative", color: "#DC2626" },
  { key: "neutral",  label: "Neutral",  color: "#6B7280" },
] as const;

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#16A34A",
  negative: "#DC2626",
  neutral:  "#6B7280",
};

const CATEGORY_SYMBOLS: Record<string, string> = {
  general:     "📰",
  development: "🏗",
  government:  "🏛",
  community:   "🏘",
  events:      "🎉",
};

// ── Deterministic lat/lng spread across Montgomery ─────────────────────────
// Articles have no coordinates, so we derive stable positions from the id.
const SPREAD_LAT = 0.09;
const SPREAD_LNG = 0.12;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getArticleLatLng(article: NewsArticle): [number, number] {
  const h = hashId(article.id);
  const lat = MONTGOMERY_CENTER[0] + ((h & 0xff) / 255 - 0.5) * 2 * SPREAD_LAT;
  const lng = MONTGOMERY_CENTER[1] + (((h >> 8) & 0xff) / 255 - 0.5) * 2 * SPREAD_LNG;
  return [lat, lng];
}

// ── Misinfo score ───────────────────────────────────────────────────────────
// Combines AI risk (0-100) with crowd flags.  Returns 0-100.
export function computeMisinfoScore(article: NewsArticle, flaggedIds: string[]): number {
  const aiScore   = article.misinfoRisk ?? 0;
  const flagCount = article.flagCount   ?? 0;
  const userFlagged = flaggedIds.includes(article.id);
  const flagScore = Math.min(flagCount * 25, 75);
  const base      = userFlagged ? Math.max(aiScore, 30) : aiScore;
  return Math.min(base + flagScore, 100);
}

// Ring diameter: 42 px at score=51, 72 px at score=100
function misinfoRingDiam(score: number): number {
  return Math.round(42 + ((Math.max(51, score) - 51) / 49) * 30);
}

// ── Marker factory ─────────────────────────────────────────────────────────
const iconCache = new Map<string, L.DivIcon>();

export function createNewsMarker(
  category: string,
  sentiment: string,
  misinfoScore = 0,
): L.DivIcon {
  const ringDiam   = misinfoScore > 50 ? misinfoRingDiam(misinfoScore) : 0;
  const cacheKey   = `${category}-${sentiment}-${ringDiam}`;
  const cached     = iconCache.get(cacheKey);
  if (cached) return cached;

  const color  = SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;
  const symbol = CATEGORY_SYMBOLS[category]  ?? "📰";
  const MARKER = 30;
  const wrap   = ringDiam > 0 ? ringDiam : MARKER;

  const ring = ringDiam > 0
    ? `<div class="misinfo-pulse" style="position:absolute;width:${ringDiam}px;height:${ringDiam}px;border-radius:50%;background:rgba(220,38,38,0.22);border:2.5px solid rgba(220,38,38,0.65);"></div>`
    : "";

  const html = `<div style="position:relative;width:${wrap}px;height:${wrap}px;display:flex;align-items:center;justify-content:center;">
    ${ring}
    <div style="position:relative;z-index:1;width:${MARKER}px;height:${MARKER}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:${Math.round(MARKER * 0.45)}px;line-height:1;cursor:pointer;">${symbol}</div>
  </div>`;

  const icon = L.divIcon({
    className: "news-symbol-marker",
    html,
    iconSize:   [wrap, wrap],
    iconAnchor: [wrap / 2, wrap / 2],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}
