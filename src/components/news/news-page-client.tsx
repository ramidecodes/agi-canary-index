"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyBriefButton } from "./copy-brief-button";
import { NewsArticleList } from "./news-article-list";
import type {
  DailyBrief,
  BriefArchiveEntry,
  NewsArticle,
  NewsFiltersOptions,
} from "@/lib/brief/types";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function BriefDirectionIcon({
  direction,
}: {
  direction: "up" | "down" | "stable";
}) {
  if (direction === "up")
    return <ArrowUp className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (direction === "down")
    return <ArrowDown className="h-4 w-4 text-red-500 shrink-0" />;
  return <Minus className="h-4 w-4 text-muted-foreground shrink-0" />;
}

export function NewsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam =
    searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const axisParam = searchParams.get("axis") ?? "";
  const sourceTierParam = searchParams.get("sourceTier") ?? "";
  const dateFromParam = searchParams.get("dateFrom") ?? "";
  const dateToParam = searchParams.get("dateTo") ?? "";

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`/news?${next.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const { data: briefData } = useSWR<{ brief: DailyBrief; isExact: boolean }>(
    `/api/brief/${encodeURIComponent(dateParam)}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: archiveData } = useSWR<{ archive: BriefArchiveEntry[] }>(
    "/api/brief/archive?limit=30",
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: filtersData } = useSWR<NewsFiltersOptions>(
    "/api/news/filters",
    fetcher,
    { revalidateOnFocus: false },
  );

  const newsParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "20");
    if (axisParam) p.set("axis", axisParam);
    if (sourceTierParam) p.set("sourceTier", sourceTierParam);
    if (dateFromParam) p.set("dateFrom", dateFromParam);
    if (dateToParam) p.set("dateTo", dateToParam);
    return p.toString();
  }, [axisParam, sourceTierParam, dateFromParam, dateToParam]);

  const { data: newsData, mutate: mutateNews } = useSWR<{
    articles: NewsArticle[];
    nextCursor: string | null;
  }>(`/api/news?${newsParams}`, fetcher, { revalidateOnFocus: false });

  const nextCursor = newsData?.nextCursor ?? null;
  const articles = newsData?.articles ?? [];
  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    fetch(`/api/news?${newsParams}&cursor=${encodeURIComponent(nextCursor)}`)
      .then((r) => r.json())
      .then((data: { articles: NewsArticle[]; nextCursor: string | null }) => {
        mutateNews(
          (prev) =>
            prev
              ? {
                  articles: [...prev.articles, ...data.articles],
                  nextCursor: data.nextCursor,
                }
              : { articles: data.articles, nextCursor: data.nextCursor },
          false,
        );
      });
  }, [nextCursor, newsParams, mutateNews]);

  const brief = briefData?.brief ?? null;
  const archive = archiveData?.archive ?? [];
  const filters = filtersData ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            News & Daily Brief
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            What moved the needle — daily summary and source articles.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-base font-medium">
                Brief for date
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={dateParam}
                  onValueChange={(v) => setParams({ date: v })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    {archive.length > 0
                      ? archive.map((e) => (
                          <SelectItem key={e.date} value={e.date}>
                            {e.date} ({e.signalsProcessed} signals)
                          </SelectItem>
                        ))
                      : [dateParam].map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                <CopyBriefButton brief={brief} />
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/news?date=${dateParam}`
                        : `/news?date=${dateParam}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share link to this date"
                  >
                    Share link
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {briefData && !brief && (
              <p className="text-sm text-muted-foreground">
                No brief available for this date.
              </p>
            )}
            {brief && (
              <>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Sources: {brief.sourcesChecked}</span>
                  <span>Signals: {brief.signalsProcessed}</span>
                  <span>
                    Coverage:{" "}
                    {brief.coverageScore != null
                      ? `${Math.round(brief.coverageScore * 100)}%`
                      : "—"}
                  </span>
                </div>
                {brief.movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No significant changes.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {brief.movements.map((m) => (
                      <li
                        key={`${m.axis}-${m.signalId}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <BriefDirectionIcon direction={m.direction} />
                        <span>
                          <span className="font-medium">{m.axisLabel}</span>
                          {m.direction !== "stable" && (
                            <span className="text-muted-foreground ml-1">
                              {m.delta > 0 ? "+" : ""}
                              {(m.delta * 100).toFixed(2)}%
                            </span>
                          )}
                          <span className="text-muted-foreground text-xs ml-1">
                            ({m.source})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Recent articles
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Processed source articles with &quot;why it matters&quot; from AI
              extraction.
            </p>
            {filters && (
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Axis</Label>
                  <Select
                    value={axisParam || "all"}
                    onValueChange={(v) =>
                      setParams({ axis: v === "all" ? null : v })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All axes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All axes</SelectItem>
                      {filters.axes.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Source tier</Label>
                  <Select
                    value={sourceTierParam || "all"}
                    onValueChange={(v) =>
                      setParams({ sourceTier: v === "all" ? null : v })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tiers</SelectItem>
                      {filters.sourceTiers.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">From date</Label>
                  <Input
                    type="date"
                    value={dateFromParam}
                    onChange={(e) =>
                      setParams({ dateFrom: e.target.value || null })
                    }
                    className="w-[140px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To date</Label>
                  <Input
                    type="date"
                    value={dateToParam}
                    onChange={(e) =>
                      setParams({ dateTo: e.target.value || null })
                    }
                    className="w-[140px]"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <NewsArticleList
              articles={articles}
              isLoading={!newsData}
              hasMore={Boolean(nextCursor)}
              onLoadMore={loadMore}
            />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground underline">
            ← Back to Control Room
          </Link>
        </p>
      </div>
    </div>
  );
}
