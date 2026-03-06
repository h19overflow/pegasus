import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/lib/newsService";
import type { NewsArticle, NewsComment } from "@/lib/types";

interface CommentFeedProps {
  comments: NewsComment[];
  articles: NewsArticle[];
}

type SortMode = "newest" | "by-article" | "by-neighborhood";

function buildArticleIndex(articles: NewsArticle[]): Map<string, NewsArticle> {
  return new Map(articles.map((a) => [a.id, a]));
}

function sortComments(comments: NewsComment[], mode: SortMode, articleIndex: Map<string, NewsArticle>): NewsComment[] {
  const copy = [...comments];
  if (mode === "newest") {
    return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (mode === "by-article") {
    return copy.sort((a, b) => a.articleId.localeCompare(b.articleId));
  }
  return copy.sort((a, b) => {
    const neighborhoodA = articleIndex.get(a.articleId)?.location?.neighborhood ?? "";
    const neighborhoodB = articleIndex.get(b.articleId)?.location?.neighborhood ?? "";
    return neighborhoodA.localeCompare(neighborhoodB);
  });
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "by-article", label: "By Article" },
  { value: "by-neighborhood", label: "By Neighborhood" },
];

export function CommentFeed({ comments, articles }: CommentFeedProps) {
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const articleIndex = buildArticleIndex(articles);
  const sortedComments = sortComments(comments, sortMode, articleIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Citizen Comment Feed</CardTitle>
        <div className="flex gap-2 flex-wrap pt-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSortMode(option.value)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors min-h-[36px] ${
                sortMode === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-foreground border-border hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {sortedComments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ScrollArea className="max-h-[400px] pr-3">
            <ul className="space-y-4">
              {sortedComments.map((comment) => {
                const article = articleIndex.get(comment.articleId);
                const neighborhood = article?.location?.neighborhood;
                return (
                  <li key={comment.id} className="flex gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 text-white"
                      style={{ backgroundColor: comment.avatarColor }}
                    >
                      {comment.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{comment.citizenName}</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 leading-snug">{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {article?.title ?? "Unknown article"}
                        {neighborhood && <> · {neighborhood}</>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
