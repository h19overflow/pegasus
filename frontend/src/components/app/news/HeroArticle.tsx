import { ExternalLink, Clock, Globe } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/newsService";

interface HeroArticleProps {
  article: NewsArticle;
  onSelect: (article: NewsArticle) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  general: "bg-white/20 text-white border-white/30",
  development: "bg-blue-400/30 text-white border-blue-300/40",
  government: "bg-amber-400/30 text-white border-amber-300/40",
  community: "bg-emerald-400/30 text-white border-emerald-300/40",
  events: "bg-purple-400/30 text-white border-purple-300/40",
};

const SENTIMENT_DOTS: Record<string, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-gray-300",
  negative: "bg-rose-400",
};

function categoryStyle(category: string): string {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general;
}

export function HeroArticle({ article, onSelect }: HeroArticleProps) {
  const hasImage = !!article.imageUrl && !article.imageUrl.startsWith("data:");

  return (
    <div
      onClick={() => onSelect(article)}
      className="relative w-full rounded-2xl overflow-hidden cursor-pointer group min-h-[280px] flex flex-col justify-end"
    >
      {/* Background */}
      {hasImage ? (
        <img
          src={article.imageUrl!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-6 space-y-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Featured
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${categoryStyle(article.category)}`}
          >
            {article.category}
          </span>
          {article.sentiment && (
            <span className="flex items-center gap-1 text-[10px] text-white/70">
              <span className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_DOTS[article.sentiment] ?? SENTIMENT_DOTS.neutral}`} />
              {article.sentiment}
            </span>
          )}
          {article.misinfoRisk != null && article.misinfoRisk > 0 && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${
                article.misinfoRisk > 60
                  ? "bg-red-400/30 text-white border-red-300/40"
                  : article.misinfoRisk > 30
                    ? "bg-amber-400/30 text-white border-amber-300/40"
                    : "bg-emerald-400/30 text-white border-emerald-300/40"
              }`}
            >
              {article.misinfoRisk > 60 ? "High Risk" : article.misinfoRisk > 30 ? "Medium Risk" : "Low Risk"}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white leading-tight line-clamp-3 group-hover:text-amber-100 transition-colors">
          {article.title}
        </h2>

        {/* Excerpt */}
        {(article.excerpt || article.summary) && (
          <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
            {article.excerpt || article.summary}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-white/60">
          {article.source && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {article.source}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(article.publishedAt)}
          </span>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-amber-300/80 hover:text-amber-200 transition-colors ml-auto"
          >
            Read full article
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
