import { bdRequest } from "./brightdataClient";
import type { NewsArticle } from "@/lib/types";

// ── Queries per category ───────────────────────────────────────────────────
const NEWS_QUERIES = [
  { query: "Montgomery Alabama news today",                        category: "general"     },
  { query: "Montgomery Alabama development construction 2026",     category: "development" },
  { query: "Montgomery Alabama city council mayor government",     category: "government"  },
  { query: "Montgomery Alabama community neighborhood programs",   category: "community"   },
  { query: "Montgomery Alabama events festival week",              category: "events"      },
] as const;

const SERP_BASE = "https://www.google.com/search";

function buildSerpUrl(query: string): string {
  return `${SERP_BASE}?${new URLSearchParams({
    q: query, tbm: "nws", hl: "en", gl: "us", brd_json: "1", num: "10",
  })}`;
}

// ── Response shape normaliser ──────────────────────────────────────────────
// Bright Data's brd_json=1 can return news_results, organic, or results
// depending on query type — handle all three.
type RawItem = Record<string, unknown>;

function extractItems(data: unknown): RawItem[] {
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.news_results)) return d.news_results as RawItem[];
  if (Array.isArray(d.organic))      return d.organic      as RawItem[];
  if (Array.isArray(d.results))      return d.results      as RawItem[];
  return [];
}

// ── Article builder ────────────────────────────────────────────────────────
function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).slice(0, 12);
}

function pickSource(item: RawItem): string {
  if (typeof item.source === "string" && item.source) return item.source;
  const disp = (item.displayed_url ?? item.sourceUrl ?? "") as string;
  return disp.replace(/^https?:\/\//i, "").split("/")[0];
}

function toArticle(item: RawItem, category: string, scrapedAt: string): NewsArticle {
  const url   = (item.url   ?? item.link        ?? "") as string;
  const title = (item.title ?? "")                     as string;
  return {
    id:           hashStr(url || title),
    title,
    excerpt:      (item.description ?? item.snippet ?? item.text ?? "") as string,
    body:         "",
    source:       pickSource(item),
    sourceUrl:    url,
    imageUrl:     (item.thumbnail ?? null) as string | null,
    category,
    publishedAt:  (item.date ?? "Just now") as string,
    scrapedAt,
    upvotes:      0,
    downvotes:    0,
    commentCount: 0,
    sentiment:    "neutral",
    sentimentScore: 0,
    misinfoRisk:  0,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Fire all 5 category queries in parallel against Bright Data SERP API,
 * then flatten + deduplicate by URL.
 */
export async function scrapeLatestNews(signal?: AbortSignal): Promise<NewsArticle[]> {
  const scrapedAt = new Date().toISOString();

  const settled = await Promise.allSettled(
    NEWS_QUERIES.map(({ query, category }) =>
      bdRequest("serp_api1", buildSerpUrl(query), signal).then((data) =>
        extractItems(data).map((item) => toArticle(item, category, scrapedAt)),
      ),
    ),
  );

  settled.forEach((r, i) => {
    if (r.status === "rejected")
      console.error(`[newsScraper] "${NEWS_QUERIES[i].query}" failed:`, r.reason);
  });

  const articles = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // Deduplicate by sourceUrl (or title as fallback)
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.sourceUrl || a.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
