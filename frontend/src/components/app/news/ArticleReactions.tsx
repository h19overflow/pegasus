import { Flag } from "lucide-react";

interface ArticleReactionsProps {
  articleId: string;
  userReaction: string | undefined;
  isFlagged: boolean;
  onReact: (articleId: string, emoji: string) => void;
  onFlag: (articleId: string) => void;
}

const EMOJI_OPTIONS = [
  { key: "thumbs_up", label: "Like", emoji: "👍" },
  { key: "heart", label: "Love", emoji: "❤️" },
  { key: "sad", label: "Sad", emoji: "😢" },
  { key: "angry", label: "Angry", emoji: "😡" },
  { key: "thumbs_down", label: "Dislike", emoji: "👎" },
];

export function ArticleReactions({
  articleId,
  userReaction,
  isFlagged,
  onReact,
  onFlag,
}: ArticleReactionsProps) {
  return (
    <div className="flex items-center gap-1">
      {EMOJI_OPTIONS.map(({ key, label, emoji }) => (
        <button
          key={key}
          title={label}
          onClick={(e) => {
            e.stopPropagation();
            onReact(articleId, key);
          }}
          className={`px-1.5 py-0.5 rounded-full text-sm transition-colors ${
            userReaction === key
              ? "bg-primary/15 ring-1 ring-primary/30 scale-110"
              : "hover:bg-muted/60"
          }`}
        >
          {emoji}
        </button>
      ))}

      <div className="w-px h-4 bg-border mx-1" />

      <button
        title="Flag as misinformation"
        onClick={(e) => {
          e.stopPropagation();
          onFlag(articleId);
        }}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
          isFlagged
            ? "bg-red-100 text-red-700 ring-1 ring-red-300"
            : "text-muted-foreground hover:bg-red-50 hover:text-red-600"
        }`}
      >
        <Flag className="w-3 h-3" />
        {isFlagged ? "Flagged" : "Flag"}
      </button>
    </div>
  );
}
