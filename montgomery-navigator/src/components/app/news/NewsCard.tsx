import { ExternalLink, ThumbsUp, MessageCircle, Clock, Globe } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/newsService";

interface NewsCardProps {
  article: NewsArticle;
  isLiked: boolean;
  onSelect: (article: NewsArticle) => void;
  onLike: (articleId: string) => void;
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

function formatScrapedDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NewsCard({ article, isLiked, onSelect, onLike }: NewsCardProps) {
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
          {/* Meta row: category + time + source */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${categoryStyle(article.category)}`}>
              {article.category}
            </span>
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

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {article.excerpt}
            </p>
          )}

          {/* Footer: source link + actions + scraped date */}
          <div className="flex items-center justify-between mt-auto pt-1">
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

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <button
                onClick={(e) => { e.stopPropagation(); onLike(article.id); }}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
                  isLiked
                    ? "text-primary bg-primary/10"
                    : "hover:text-primary hover:bg-primary/5"
                }`}
              >
                <ThumbsUp className={`w-3 h-3 ${isLiked ? "fill-primary" : ""}`} />
                {article.upvotes}
              </button>
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
