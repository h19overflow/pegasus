import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCommentStore } from "@/stores/adminCommentStore";
import { formatRelativeTime } from "@/lib/newsService";
import type { NewsArticle, NewsComment } from "@/lib/types";

interface CommentFeedProps {
  comments?: NewsComment[];
  articles: NewsArticle[];
  onAskAI?: (question: string) => void;
}

type SortMode = "newest" | "by-article" | "by-neighborhood";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Latest" },
  { value: "by-article", label: "By Story" },
  { value: "by-neighborhood", label: "By Area" },
];

function buildArticleIndex(articles: NewsArticle[]): Map<string, NewsArticle> {
  return new Map(articles.map((a) => [a.id, a]));
}

function sortComments(comments: NewsComment[], mode: SortMode, articleIndex: Map<string, NewsArticle>): NewsComment[] {
  const copy = [...comments];
  if (mode === "newest") return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (mode === "by-article") return copy.sort((a, b) => a.articleId.localeCompare(b.articleId));
  return copy.sort((a, b) => {
    const na = articleIndex.get(a.articleId)?.location?.neighborhood ?? "";
    const nb = articleIndex.get(b.articleId)?.location?.neighborhood ?? "";
    return na.localeCompare(nb);
  });
}

function groupCommentsByArticle(
  comments: NewsComment[],
  articleIndex: Map<string, NewsArticle>,
): { article: NewsArticle | undefined; articleId: string; comments: NewsComment[] }[] {
  const groups = new Map<string, NewsComment[]>();
  for (const c of comments) {
    const existing = groups.get(c.articleId) ?? [];
    existing.push(c);
    groups.set(c.articleId, existing);
  }
  return [...groups.entries()]
    .map(([articleId, groupComments]) => ({
      articleId,
      article: articleIndex.get(articleId),
      comments: groupComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }))
    .sort((a, b) => b.comments.length - a.comments.length);
}

function groupCommentsByNeighborhood(
  comments: NewsComment[],
  articleIndex: Map<string, NewsArticle>,
): { neighborhood: string; comments: NewsComment[] }[] {
  const groups = new Map<string, NewsComment[]>();
  for (const c of comments) {
    const neighborhood = articleIndex.get(c.articleId)?.location?.neighborhood ?? "Unknown";
    const existing = groups.get(neighborhood) ?? [];
    existing.push(c);
    groups.set(neighborhood, existing);
  }
  return [...groups.entries()]
    .map(([neighborhood, groupComments]) => ({
      neighborhood,
      comments: groupComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }))
    .sort((a, b) => b.comments.length - a.comments.length);
}

function CommentRow({ comment, article, onAskAI, showMeta = true }: {
  comment: NewsComment;
  article: NewsArticle | undefined;
  onAskAI?: (q: string) => void;
  showMeta?: boolean;
}) {
  const neighborhood = article?.location?.neighborhood;
  const articleTitle = article?.title ?? "Unknown article";

  function handleClick() {
    if (!onAskAI || !article) return;
    onAskAI(`Tell me more about "${articleTitle}" and what citizens are saying about it`);
  }

  return (
    <li
      className={`flex gap-3 ${onAskAI && article ? "cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-1 rounded-lg transition-colors" : ""}`}
      onClick={handleClick}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 text-white" style={{ backgroundColor: comment.avatarColor }}>
        {comment.avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{comment.citizenName}</span>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground mt-0.5 leading-snug">{comment.content}</p>
        {showMeta && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {articleTitle}
            {neighborhood && <> · {neighborhood}</>}
          </p>
        )}
      </div>
    </li>
  );
}

function CollapsibleGroup({ label, sublabel, count, defaultOpen = true, children }: {
  label: string;
  sublabel?: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/60 border border-border/30 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          }
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">{label}</p>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {count} {count === 1 ? "comment" : "comments"}
        </span>
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}

function GroupedByStory({ comments, articleIndex, onAskAI }: {
  comments: NewsComment[];
  articleIndex: Map<string, NewsArticle>;
  onAskAI?: (q: string) => void;
}) {
  const groups = groupCommentsByArticle(comments, articleIndex);

  return (
    <div className="space-y-3">
      {groups.map(({ articleId, article, comments: groupComments }, index) => (
        <CollapsibleGroup
          key={articleId}
          label={article?.title ?? "Unknown article"}
          sublabel={article?.location?.neighborhood}
          count={groupComments.length}
          defaultOpen={index === 0}
        >
          <ul className="space-y-3 pl-3 border-l-2 border-border/30">
            {groupComments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} article={article} onAskAI={onAskAI} showMeta={false} />
            ))}
          </ul>
        </CollapsibleGroup>
      ))}
    </div>
  );
}

function GroupedByArea({ comments, articleIndex, onAskAI }: {
  comments: NewsComment[];
  articleIndex: Map<string, NewsArticle>;
  onAskAI?: (q: string) => void;
}) {
  const groups = groupCommentsByNeighborhood(comments, articleIndex);

  return (
    <div className="space-y-3">
      {groups.map(({ neighborhood, comments: groupComments }, index) => (
        <CollapsibleGroup
          key={neighborhood}
          label={neighborhood}
          count={groupComments.length}
          defaultOpen={index === 0}
        >
          <ul className="space-y-3 pl-3 border-l-2 border-border/30">
            {groupComments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} article={articleIndex.get(comment.articleId)} onAskAI={onAskAI} />
            ))}
          </ul>
        </CollapsibleGroup>
      ))}
    </div>
  );
}

export function CommentFeed({ comments: propComments = [], articles, onAskAI }: CommentFeedProps) {
  const { comments: apiComments, isLoading, fetchComments, mergeWithLocal } = useAdminCommentStore();
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const articleIndex = buildArticleIndex(articles);
  const allComments = mergeWithLocal(propComments);
  const sortedComments = sortComments(allComments, sortMode, articleIndex);

  function renderCommentList() {
    if (sortMode === "by-article") {
      return <GroupedByStory comments={allComments} articleIndex={articleIndex} onAskAI={onAskAI} />;
    }
    if (sortMode === "by-neighborhood") {
      return <GroupedByArea comments={allComments} articleIndex={articleIndex} onAskAI={onAskAI} />;
    }
    return (
      <ul className="space-y-4">
        {sortedComments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} article={articleIndex.get(comment.articleId)} onAskAI={onAskAI} />
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What Citizens Are Saying</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSortMode(option.value)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors min-h-[32px] ${
                sortMode === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-foreground border-border hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Loading comments…</p>}
        {!isLoading && allComments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {!isLoading && allComments.length > 0 && (
          <div className="relative">
            <div className="max-h-[500px] overflow-y-auto pr-3 scroll-smooth">
              {renderCommentList()}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
