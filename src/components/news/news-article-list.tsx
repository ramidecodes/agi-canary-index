"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NewsArticle } from "@/lib/brief/types";
import { AXIS_LABELS } from "@/lib/brief/types";
import {
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

/** Determine article significance for visual hierarchy. */
function getSignificance(article: NewsArticle): "high" | "medium" | "low" {
  if (article.confidence >= 0.8 && article.tags.length >= 2) return "high";
  if (article.confidence >= 0.6) return "medium";
  return "low";
}

/** Classify article by its tags for visual differentiation. */
function getArticleType(
  article: NewsArticle,
): "benchmark" | "policy" | "research" | "general" {
  const tagStr = article.tags.join(" ").toLowerCase();
  if (tagStr.includes("benchmark") || tagStr.includes("evaluation"))
    return "benchmark";
  if (tagStr.includes("policy") || tagStr.includes("regulation"))
    return "policy";
  if (tagStr.includes("research") || tagStr.includes("paper"))
    return "research";
  return "general";
}

const TYPE_BORDER_COLORS = {
  benchmark: "border-l-blue-500",
  policy: "border-l-orange-500",
  research: "border-l-purple-500",
  general: "border-l-border",
};

const TYPE_ICONS = {
  benchmark: TrendingUp,
  policy: AlertTriangle,
  research: Newspaper,
  general: Newspaper,
};

function ArticleCard({
  article,
  significance,
}: {
  article: NewsArticle;
  significance: "high" | "medium" | "low";
}) {
  const articleType = getArticleType(article);
  const TypeIcon = TYPE_ICONS[articleType];
  const isHighlighted = significance === "high";

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 transition-shadow",
        TYPE_BORDER_COLORS[articleType],
        isHighlighted && "shadow-md bg-card",
        significance === "low" && "opacity-80",
      )}
    >
      <CardHeader className={cn("pb-2", significance === "low" && "py-2")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <TypeIcon
              className={cn(
                "h-4 w-4 shrink-0 mt-0.5",
                isHighlighted ? "text-foreground" : "text-muted-foreground",
              )}
              aria-hidden
            />
            <CardTitle
              className={cn(
                "leading-tight",
                isHighlighted
                  ? "text-base font-semibold"
                  : "text-sm font-medium",
              )}
            >
              {article.title ?? "Untitled"}
            </CardTitle>
          </div>
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
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pl-6">
          {article.sourceName && <span>{article.sourceName}</span>}
          {article.publishedAt && (
            <span>{formatDate(article.publishedAt)}</span>
          )}
          {article.tags.length > 0 && (
            <span className="flex gap-1 flex-wrap">
              {article.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {AXIS_LABELS[tag] ?? tag}
                </Badge>
              ))}
              {article.tags.length > 3 && (
                <span className="text-muted-foreground/70">
                  +{article.tags.length - 3}
                </span>
              )}
            </span>
          )}
          <span
            className={cn(
              "font-mono",
              article.confidence >= 0.8
                ? "text-emerald-600 dark:text-emerald-400"
                : article.confidence >= 0.6
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60",
            )}
          >
            {Math.round(article.confidence * 100)}%
          </span>
        </div>
      </CardHeader>
      {article.whyItMatters && significance !== "low" && (
        <CardContent className="pt-0 pl-10">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">
              Why it matters:{" "}
            </span>
            {article.whyItMatters}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export function NewsArticleList({
  articles,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}: NewsArticleListProps) {
  // Sort by significance (impact = confidence), group high-impact first
  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => b.confidence - a.confidence);
  }, [articles]);

  // Group by axis for the digest
  const axisGroups = useMemo(() => {
    const groups: Record<string, NewsArticle[]> = {};
    for (const article of articles) {
      for (const tag of article.tags) {
        if (AXIS_LABELS[tag]) {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(article);
        }
      }
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [articles]);

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
      {/* Axis distribution digest */}
      {axisGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pb-2 border-b border-border/50">
          {axisGroups.slice(0, 6).map(([axis, items]) => (
            <span
              key={axis}
              className="inline-flex items-center gap-1 bg-muted/50 rounded px-2 py-0.5"
            >
              <span className="font-medium">{AXIS_LABELS[axis] ?? axis}</span>
              <span className="text-muted-foreground/70">({items.length})</span>
            </span>
          ))}
        </div>
      )}

      {/* Articles sorted by significance */}
      {sortedArticles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          significance={getSignificance(article)}
        />
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
