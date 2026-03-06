import { ArrowLeft, ExternalLink, Clock, Globe, Calendar, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/newsService";
import { NewsCommentSection } from "./NewsCommentSection";
import { ArticleReactions } from "./ArticleReactions";

interface NewsDetailProps {
  article: NewsArticle;
  userReaction: string | null;
  isFlagged: boolean;
  onBack: () => void;
  onReact: (articleId: string, emoji: string | null) => void;
  onFlag: (articleId: string) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 border-slate-200",
  development: "bg-blue-50 text-blue-700 border-blue-200",
  government: "bg-amber-50 text-amber-700 border-amber-200",
  community: "bg-emerald-50 text-emerald-700 border-emerald-200",
  events: "bg-purple-50 text-purple-700 border-purple-200",
};

function formatFullDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MisinfoPanel({ risk, reason }: { risk: number; reason?: string }) {
  const isLow    = risk <= 30;
  const isMedium = risk > 30 && risk <= 60;
  const Icon     = isLow ? ShieldCheck : isMedium ? ShieldAlert : ShieldX;
  const { bg, border, text, label } = isLow
    ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", label: "Low Risk" }
    : isMedium
    ? { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",   label: "Medium Risk" }
    : { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-800",     label: "High Risk"   };

  return (
    <div className={`rounded-lg border p-4 ${bg} ${border}`}>
      <div className={`flex items-center gap-2 ${text}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold">Misinformation Assessment — {label}</span>
        <span className="ml-auto text-xs font-bold opacity-70">{risk}/100</span>
      </div>
      {reason && (
        <p className={`mt-2 text-xs leading-relaxed ${text} opacity-80`}>{reason}</p>
      )}
    </div>
  );
}

export function NewsDetail({ article, userReaction, isFlagged, onBack, onReact, onFlag }: NewsDetailProps) {
  const scrapedDate = formatFullDate(article.scrapedAt);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header */}
      <div className="shrink-0 flex items-center gap-3 border-b border-border/50 bg-white px-4 py-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-foreground truncate">Back to feed</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
          {/* Hero image */}
          {article.imageUrl && (
            <div className="rounded-xl overflow-hidden bg-muted -mx-1">
              <img src={article.imageUrl} alt="" className="w-full h-48 sm:h-64 object-cover" />
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${CATEGORY_STYLES[article.category] ?? CATEGORY_STYLES.general}`}>
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(article.publishedAt)}
            </span>
            {article.source && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" />
                {article.source}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground leading-tight">{article.title}</h1>

          {/* Source info card */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{article.source}</p>
                {scrapedDate && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Collected {scrapedDate}
                  </p>
                )}
              </div>
            </div>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 hover:bg-primary/5 transition-colors"
            >
              Visit source
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Misinformation assessment panel */}
          {article.misinfoRisk != null && (
            <MisinfoPanel risk={article.misinfoRisk} reason={article.misinfoReason} />
          )}

          {/* Excerpt / body */}
          {article.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed">{article.excerpt}</p>
          )}

          {article.body && (
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {article.body}
            </div>
          )}

          {/* Read full article CTA */}
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg py-3 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            Read Full Article on {article.source}
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Actions bar */}
          <div className="border-y border-border/50 py-3">
            <ArticleReactions
              articleId={article.id}
              reactionCounts={article.reactionCounts ?? {}}
              userReaction={userReaction}
              flagCount={article.flagCount ?? 0}
              isFlagged={isFlagged}
              onReact={onReact}
              onFlag={onFlag}
            />
          </div>

          {/* Comments */}
          <NewsCommentSection articleId={article.id} />
        </div>
      </div>
    </div>
  );
}
