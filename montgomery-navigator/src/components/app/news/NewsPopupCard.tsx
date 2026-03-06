import { ExternalLink } from "lucide-react";
import type { NewsArticle, ReactionType } from "@/lib/types";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import { formatRelativeTime } from "@/lib/newsService";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "thumbs_up", emoji: "👍", label: "Like" },
  { type: "thumbs_down", emoji: "👎", label: "Dislike" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

interface NewsPopupCardProps {
  article: NewsArticle;
  reactionCounts: Record<ReactionType, number>;
  userReaction: ReactionType | undefined;
  onReact: (articleId: string, reaction: ReactionType) => void;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const color = getSentimentColor(sentiment);
  const label = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: `${color}20`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function NewsPopupCard({ article, reactionCounts, userReaction, onReact }: NewsPopupCardProps) {
  const totalReactions = Object.values(reactionCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="min-w-[260px] max-w-[300px] font-sans">
      {article.imageUrl && (
        <img
          src={article.imageUrl}
          alt=""
          className="w-full h-[120px] object-cover rounded-t-md mb-2"
        />
      )}

      <div className="flex items-center gap-1.5 mb-1">
        <SentimentBadge sentiment={article.sentiment ?? "neutral"} />
        <span className="text-[10px] text-muted-foreground capitalize">{article.category}</span>
      </div>

      <h3 className="text-[13px] font-bold leading-snug text-foreground mb-1">
        {article.title}
      </h3>

      {article.summary && (
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-3">
          {article.summary}
        </p>
      )}
      {!article.summary && article.excerpt && (
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">
          {article.excerpt}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between mb-2 text-[10px] text-muted-foreground">
        <span>{article.source} · {formatRelativeTime(article.publishedAt || article.scrapedAt)}</span>
        {article.location?.neighborhood && (
          <span className="font-medium text-foreground/70">
            📍 {article.location.neighborhood}
          </span>
        )}
      </div>

      {/* Reactions */}
      <div className="flex gap-0.5 pt-2 border-t border-border/40 mb-1.5">
        {REACTIONS.map(({ type, emoji, label }) => {
          const isActive = userReaction === type;
          const count = reactionCounts[type] ?? 0;
          return (
            <button
              key={type}
              onClick={() => onReact(article.id, type)}
              aria-label={label}
              title={label}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-full text-xs border transition-colors
                ${isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-transparent text-foreground hover:bg-muted/50"
                }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-[10px]">{count}</span>}
            </button>
          );
        })}
      </div>

      {totalReactions > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2">
          {totalReactions} reaction{totalReactions !== 1 ? "s" : ""} from residents
        </p>
      )}

      <a
        href={article.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        Read full article <ExternalLink className="w-2.5 h-2.5" />
      </a>
    </div>
  );
}
