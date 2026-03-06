import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  { value: "newest", label: "Newest" },
  { value: "by-article", label: "By Article" },
  { value: "by-neighborhood", label: "By Neighborhood" },
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

function CommentRow({ comment, article, onAskAI }: { comment: NewsComment; article: NewsArticle | undefined; onAskAI?: (q: string) => void }) {
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
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {articleTitle}
          {neighborhood && <> · {neighborhood}</>}
        </p>
      </div>
    </li>
  );
}

export function CommentFeed({ comments: propComments = [], articles, onAskAI }: CommentFeedProps) {
  const { comments: apiComments, isLoading, fetchComments, mergeWithLocal } = useAdminCommentStore();
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const articleIndex = buildArticleIndex(articles);
  const allComments = mergeWithLocal(propComments);
  const sortedComments = sortComments(allComments, sortMode, articleIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Citizen Comment Feed</CardTitle>
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
        {!isLoading && sortedComments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {!isLoading && sortedComments.length > 0 && (
          <ScrollArea className="h-[400px] pr-3">
            <ul className="space-y-4">
              {sortedComments.map((comment) => (
                <CommentRow key={comment.id} comment={comment} article={articleIndex.get(comment.articleId)} onAskAI={onAskAI} />
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
