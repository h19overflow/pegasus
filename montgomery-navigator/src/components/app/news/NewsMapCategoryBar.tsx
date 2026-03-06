import { NEWS_MAP_CATEGORIES, computeMisinfoScore } from "@/lib/newsMapUtils";
import type { NewsArticle } from "@/lib/types";

interface NewsMapCategoryBarProps {
  articles: NewsArticle[];
  activeCategories: Set<string>;
  onToggle: (id: string) => void;
  misinfoOnly: boolean;
  onMisinfoToggle: () => void;
  flaggedArticleIds: string[];
}

export function NewsMapCategoryBar({
  articles, activeCategories, onToggle,
  misinfoOnly, onMisinfoToggle, flaggedArticleIds,
}: NewsMapCategoryBarProps) {
  const misinfoCount = articles.filter(
    (a) => computeMisinfoScore(a, flaggedArticleIds) > 50
  ).length;

  return (
    <div className="shrink-0 flex flex-wrap gap-2 px-6 py-3 border-b border-border/20 bg-white">
      {NEWS_MAP_CATEGORIES.map(({ id, label, symbol }) => {
        const active = activeCategories.has(id);
        const count = articles.filter((a) => a.category === id).length;
        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
              active
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/30 text-muted-foreground border-transparent opacity-50",
            ].join(" ")}
          >
            <span>{symbol}</span>
            {label}
            {count > 0 && <span className="text-[10px] opacity-70">{count}</span>}
          </button>
        );
      })}

      <span className="w-px self-stretch bg-border/40 mx-1" />

      <button
        onClick={onMisinfoToggle}
        className={[
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
          misinfoOnly
            ? "bg-red-50 text-red-700 border-red-300"
            : "bg-muted/30 text-muted-foreground border-transparent opacity-60 hover:opacity-100",
        ].join(" ")}
      >
        <span>🚩</span>
        Misinformation
        {misinfoCount > 0 && <span className="text-[10px] opacity-70">{misinfoCount}</span>}
      </button>
    </div>
  );
}
