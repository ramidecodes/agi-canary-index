"use client";

import useSWR from "swr";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { AXIS_LABELS, TIER_LABELS } from "@/lib/signals/types";
import type { SignalDetail } from "@/lib/signals/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function buildCitation(signal: SignalDetail): string {
  const parts: string[] = [];
  parts.push(`"${signal.claimSummary}"`);
  if (signal.sourceName) parts.push(`Source: ${signal.sourceName}`);
  if (signal.url) parts.push(signal.url);
  parts.push(
    `AGI Canary Watcher Signal Explorer. Retrieved ${formatDate(
      signal.createdAt,
    )}.`,
  );
  return parts.join(". ");
}

export interface SignalDetailSheetProps {
  signalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignalDetailSheet({
  signalId,
  open,
  onOpenChange,
}: SignalDetailSheetProps) {
  const [copied, setCopied] = useState(false);

  const {
    data: signal,
    error,
    isLoading,
  } = useSWR<SignalDetail>(
    open && signalId ? `/api/signals/${signalId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const handleCopyCitation = useCallback(async () => {
    if (!signal) return;
    const text = buildCitation(signal);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [signal]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          {isLoading && (
            <div className="h-6 w-3/4 bg-muted/30 rounded animate-pulse" />
          )}
          {error && (
            <SheetTitle className="text-destructive">Failed to load</SheetTitle>
          )}
          {signal && (
            <>
              <SheetDescription className="font-mono text-xs text-muted-foreground">
                {formatDate(signal.createdAt)}
              </SheetDescription>
              <SheetTitle className="text-lg font-semibold leading-tight">
                Signal detail
              </SheetTitle>
            </>
          )}
        </SheetHeader>

        {signal && (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-sm text-foreground leading-relaxed">
                {signal.claimSummary}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Capability axes impacted
              </p>
              <div className="space-y-1.5">
                {(signal.axesImpacted ?? []).map((a) => (
                  <div
                    key={a.axis}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{AXIS_LABELS[a.axis] ?? a.axis}</span>
                    <span className="text-muted-foreground">
                      {a.direction} · {(a.magnitude * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {signal.metric && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Benchmark data
                </p>
                <p className="text-sm">
                  {signal.metric.name}: {signal.metric.value}
                  {signal.metric.unit ? ` ${signal.metric.unit}` : ""}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Confidence
              </p>
              <p className="text-sm">
                {(signal.confidence * 100).toFixed(0)}% ·{" "}
                <Badge
                  variant={
                    signal.classification === "benchmark"
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {signal.classification}
                </Badge>
              </p>
            </div>

            {(signal.sourceName || signal.sourceTier) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Source
                </p>
                <p className="text-sm">
                  {signal.sourceName ?? "—"}
                  {signal.sourceTier && (
                    <span className="ml-1 text-muted-foreground">
                      ({TIER_LABELS[signal.sourceTier] ?? signal.sourceTier})
                    </span>
                  )}
                </p>
              </div>
            )}

            {signal.citations && signal.citations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Citations
                </p>
                <ul className="space-y-2">
                  {signal.citations.map((c, i) => (
                    <li key={c.url ?? c.quoted_span ?? i} className="text-sm">
                      {c.quoted_span && (
                        <blockquote className="border-l-2 border-muted pl-2 text-muted-foreground italic mb-1">
                          {c.quoted_span}
                        </blockquote>
                      )}
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all text-xs"
                        >
                          {c.url}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {signal.url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    View source
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCitation}
                className="inline-flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy citation
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
