import type { NewsArticle, NewsCategory } from "./types";

interface NewsFeedResponse {
  lastScraped: string;
  totalArticles: number;
  articles: NewsArticle[];
}

let cached: NewsArticle[] | null = null;

function deduplicateByTitle(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function refreshNewsArticles(): void {
  cached = null;
}

export async function fetchNewsArticles(): Promise<NewsArticle[]> {
  if (cached) return cached;

  const response = await fetch("/data/news_feed.json");
  if (!response.ok) return [];

  const data: NewsFeedResponse = await response.json();
  const raw = data.articles ?? [];
  cached = deduplicateByTitle(raw);
  return cached;
}

export function filterArticlesByCategory(
  articles: NewsArticle[],
  category: NewsCategory,
): NewsArticle[] {
  if (category === "all") return articles;
  return articles.filter((a) => a.category === category);
}

export function sortArticlesByDate(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((a, b) => {
    // publishedAt can be relative ("14 hours ago") or ISO date
    // For relative dates, prefer scrapedAt as fallback sort key
    const dateA = Date.parse(a.publishedAt) || Date.parse(a.scrapedAt) || 0;
    const dateB = Date.parse(b.publishedAt) || Date.parse(b.scrapedAt) || 0;
    return dateB - dateA;
  });
}

export function formatRelativeTime(dateString: string): string {
  // If already relative (e.g., "14 hours ago"), return as-is
  if (dateString.includes("ago") || dateString.includes("hour") || dateString.includes("day")) {
    return dateString;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
