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
import { ExternalLink } from "lucide-react";
import type { TimelineEvent } from "@/lib/timeline/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  benchmark: "Benchmark",
  model: "Model release",
  policy: "Policy",
  research: "Research",
};

export interface EventDetailSheetProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailSheet({
  eventId,
  open,
  onOpenChange,
}: EventDetailSheetProps) {
  const { data, error, isLoading } = useSWR<TimelineEvent>(
    open && eventId ? `/api/timeline/event/${eventId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          {isLoading && (
            <div className="h-6 w-3/4 bg-muted/30 rounded animate-pulse" />
          )}
          {error && (
            <SheetTitle className="text-destructive">Failed to load</SheetTitle>
          )}
          {data && (
            <>
              <SheetDescription className="font-mono text-xs text-muted-foreground">
                {formatDate(data.date)}
              </SheetDescription>
              <SheetTitle className="text-lg font-semibold">
                {data.title}
              </SheetTitle>
              {data.category && (
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[data.category] ?? data.category}
                </span>
              )}
            </>
          )}
        </SheetHeader>
        {data && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-foreground/90 leading-relaxed">
              {data.description}
            </p>
            {data.axesImpacted && data.axesImpacted.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Capability axes impacted
                </p>
                <div className="flex flex-wrap gap-1">
                  {data.axesImpacted.map((axis) => (
                    <span
                      key={axis}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                    >
                      {axis.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.sourceUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  View source
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
