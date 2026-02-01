"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Canary } from "@/lib/home/types";

const STATUS_COLORS: Record<string, string> = {
  green:
    "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  yellow:
    "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  red: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
  gray: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  green: "Low concern",
  yellow: "Moderate",
  red: "Concerning",
  gray: "Unknown",
};

interface RiskCanariesPanelProps {
  canaries: Canary[];
  className?: string;
}

export function RiskCanariesPanel({
  canaries,
  className = "",
}: RiskCanariesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Risk canaries</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {canaries.map((c) => {
            const isExpanded = expandedId === c.id;
            const statusClass = STATUS_COLORS[c.status] ?? STATUS_COLORS.gray;
            const statusLabel = STATUS_LABELS[c.status] ?? "Unknown";

            return (
              <li key={c.id}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={(o) => setExpandedId(o ? c.id : null)}
                >
                  <CollapsibleTrigger
                    className="w-full flex items-start gap-3 text-left rounded-lg p-2 -m-2 hover:bg-muted/50 transition-colors outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${statusClass}`}
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                      {c.lastChange && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last change: {c.lastChange}
                          {c.confidence != null &&
                            ` · Confidence: ${Math.round(
                              (c.confidence as number) * 100,
                            )}%`}
                        </p>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-7 mt-1 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      {c.description}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
