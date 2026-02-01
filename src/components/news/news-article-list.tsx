"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NewsArticle } from "@/lib/brief/types";
import { ExternalLink } from "lucide-react";

interface NewsArticleListProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function NewsArticleList({
  articles,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}: NewsArticleListProps) {
  if (isLoading && articles.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/4 bg-muted rounded mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No articles match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <Card key={article.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-medium leading-tight">
                {article.title ?? "Untitled"}
              </CardTitle>
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Open original article"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {article.sourceName && <span>{article.sourceName}</span>}
              {article.publishedAt && (
                <span>{formatDate(article.publishedAt)}</span>
              )}
              {article.tags.length > 0 && (
                <span className="flex gap-1 flex-wrap">
                  {article.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                </span>
              )}
              <span title="Confidence">
                {Math.round(article.confidence * 100)}% confidence
              </span>
            </div>
          </CardHeader>
          {article.whyItMatters && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  Why it matters:{" "}
                </span>
                {article.whyItMatters}
              </p>
            </CardContent>
          )}
        </Card>
      ))}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
