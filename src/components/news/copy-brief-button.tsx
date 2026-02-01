"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DailyBrief } from "@/lib/brief/types";
import { Copy, Check } from "lucide-react";

function formatBriefForCopy(brief: DailyBrief, baseUrl: string): string {
  const lines: string[] = [`AGI Canary Watcher - ${brief.resolvedDate}`, ""];
  if (brief.movements.length === 0) {
    lines.push("No significant changes.");
  } else {
    for (const m of brief.movements) {
      const arrow =
        m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
      const deltaStr =
        m.direction !== "stable"
          ? ` ${m.delta > 0 ? "+" : ""}${(m.delta * 100).toFixed(2)}%`
          : "";
      lines.push(`${arrow} ${m.axisLabel}${deltaStr} (${m.source})`);
    }
  }
  lines.push("");
  lines.push(`${baseUrl}/news?date=${brief.resolvedDate}`);
  return lines.join("\n");
}

interface CopyBriefButtonProps {
  brief: DailyBrief | null;
  disabled?: boolean;
  className?: string;
}

export function CopyBriefButton({
  brief,
  disabled = false,
  className = "",
}: CopyBriefButtonProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackText, setFallbackText] = useState("");

  const handleCopy = useCallback(() => {
    if (!brief) return;
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://canary.example.com";
    const text = formatBriefForCopy(brief, baseUrl);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          setFallbackText(text);
          setFallbackOpen(true);
        });
    } else {
      setFallbackText(text);
      setFallbackOpen(true);
    }
  }, [brief]);

  if (!brief) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={disabled}
        className={className}
        aria-label="Copy brief to clipboard"
      >
        {copied ? (
          <Check className="h-4 w-4 mr-1 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4 mr-1" />
        )}
        {copied ? "Copied" : "Copy brief"}
      </Button>
      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy brief</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Clipboard not available. Select and copy the text below:
          </p>
          <textarea
            readOnly
            className="w-full h-40 p-3 text-sm font-mono bg-muted rounded-md border"
            value={fallbackText}
            aria-label="Brief text to copy"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
