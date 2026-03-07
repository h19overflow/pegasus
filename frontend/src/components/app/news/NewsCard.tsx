import { ExternalLink, MessageCircle, Clock, Globe } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/newsService";
import { ArticleReactions } from "./ArticleReactions";

interface NewsCardProps {
  article: NewsArticle;
  userReaction: string | undefined;
  isFlagged: boolean;
  onSelect: (article: NewsArticle) => void;
  onReact: (articleId: string, emoji: string) => void;
  onFlag: (articleId: string) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 border-slate-200",
  development: "bg-blue-50 text-blue-700 border-blue-200",
  government: "bg-amber-50 text-amber-700 border-amber-200",
  community: "bg-emerald-50 text-emerald-700 border-emerald-200",
  events: "bg-purple-50 text-purple-700 border-purple-200",
};

function categoryStyle(category: string): string {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general;
}

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-gray-100 text-gray-600 border-gray-200",
  negative: "bg-rose-50 text-rose-700 border-rose-200",
};

function sentimentStyle(sentiment: string): string {
  return SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral;
}

function formatScrapedDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MisinfoRiskBadge({ risk }: { risk: number }) {
  if (risk > 60) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
        High Risk
      </span>
    );
  }
  if (risk > 30) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
        Medium Risk
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
      Low Risk
    </span>
  );
}

export function NewsCard({ article, userReaction, isFlagged, onSelect, onReact, onFlag }: NewsCardProps) {
  const scrapedDate = formatScrapedDate(article.scrapedAt);

  return (
    <div
      className="w-full text-left group rounded-xl border border-border bg-background
                 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onSelect(article)}
    >
      <div className="flex flex-col sm:flex-row gap-0">
        {article.imageUrl && (
          <div className="sm:w-36 sm:shrink-0 h-40 sm:h-auto overflow-hidden bg-muted">
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 p-4 flex-1 min-w-0">
          {/* Meta row: category + sentiment + misinfo + time + source */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${categoryStyle(article.category)}`}>
              {article.category}
            </span>
            {article.sentiment && (
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${sentimentStyle(article.sentiment)}`}>
                {article.sentiment}
              </span>
            )}
            {article.misinfoRisk != null && article.misinfoRisk > 0 && (
              <MisinfoRiskBadge risk={article.misinfoRisk} />
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(article.publishedAt)}
            </span>
            {article.source && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Globe className="w-3 h-3" />
                {article.source}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>

          {/* Excerpt or summary fallback */}
          {(article.excerpt || article.summary) && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {article.excerpt || article.summary}
            </p>
          )}

          {/* Footer: source link + reactions + comments */}
          <div className="flex items-center justify-between mt-auto pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary font-medium transition-colors"
              >
                Read full article
                <ExternalLink className="w-3 h-3" />
              </a>
              {scrapedDate && (
                <span className="text-[10px] text-muted-foreground/60">
                  Scraped {scrapedDate}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ArticleReactions
                articleId={article.id}
                userReaction={userReaction}
                isFlagged={isFlagged}
                onReact={onReact}
                onFlag={onFlag}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(article); }}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                {article.commentCount}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
