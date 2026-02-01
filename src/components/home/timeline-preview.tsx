"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TimelineEvent } from "@/lib/home/types";
import { ChevronRight } from "lucide-react";

interface TimelinePreviewProps {
  events: TimelineEvent[];
  className?: string;
}

const EVENT_TYPE_COLORS = {
  reality: "bg-chart-1",
  fiction: "bg-chart-3",
  speculative: "bg-chart-4",
} as const;

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TimelinePreview({
  events,
  className = "",
}: TimelinePreviewProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Timeline</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/timeline" className="text-xs">
              View all
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul
            className="flex gap-6 overflow-x-auto pb-2 -mx-1 scrollbar-thin list-none"
            style={{ scrollbarWidth: "thin" }}
          >
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  key={e.id}
                  href={`/timeline?event=${e.id}`}
                  title={e.title}
                  className="shrink-0 min-w-60 w-60 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        EVENT_TYPE_COLORS[e.eventType] ?? "bg-muted"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(e.date)}
                    </span>
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{e.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
