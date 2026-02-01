"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { AXIS_LABELS, TIER_LABELS } from "@/lib/signals/types";
import { AXES } from "@/lib/signal/schemas";

export interface SignalFiltersState {
  axes: Set<string>;
  dateFrom: string;
  dateTo: string;
  sourceTier: string | null;
  sourceId: string | null;
  confidenceMin: number;
  hasBenchmark: boolean | null;
  highConfidenceOnly: boolean;
  q: string;
}

const DEFAULT_FILTERS: SignalFiltersState = {
  axes: new Set(),
  dateFrom: "",
  dateTo: "",
  sourceTier: null,
  sourceId: null,
  confidenceMin: 0,
  hasBenchmark: null,
  highConfidenceOnly: false,
  q: "",
};

export interface SignalFiltersProps {
  filters: SignalFiltersState;
  onFiltersChange: (f: SignalFiltersState) => void;
}

export function SignalFilters({
  filters,
  onFiltersChange,
}: SignalFiltersProps) {
  const [localQ, setLocalQ] = useState(filters.q);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const update = useCallback(
    (patch: Partial<SignalFiltersState>) => {
      onFiltersChange({ ...filters, ...patch });
    },
    [filters, onFiltersChange]
  );

  const handleAxisToggle = useCallback(
    (axis: string, checked: boolean) => {
      const next = new Set(filters.axes);
      if (checked) next.add(axis);
      else next.delete(axis);
      update({ axes: next });
    },
    [filters.axes, update]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      update({ q: localQ.trim() });
    },
    [localQ, update]
  );

  const handleHighConfidenceToggle = useCallback(
    (checked: boolean) => {
      update({
        highConfidenceOnly: checked,
        confidenceMin: checked ? 0.7 : 0,
      });
    },
    [update]
  );

  const handleReset = useCallback(() => {
    setLocalQ("");
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.axes.size > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sourceTier ||
    filters.sourceId ||
    filters.confidenceMin > 0 ||
    filters.hasBenchmark !== null ||
    filters.highConfidenceOnly ||
    filters.q;

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search claims, sources, benchmarks..."
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="pl-8"
            aria-label="Search signals"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Reset filters
            </Button>
          )}
        </div>
      </form>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="rounded-full bg-primary/20 px-1.5 text-xs">
                active
              </span>
            )}
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Capability axes
              </Label>
              <div className="flex flex-wrap gap-x-4 gap-y-1 max-h-32 overflow-y-auto">
                {AXES.map((axis) => {
                  const checked =
                    filters.axes.size === 0 || filters.axes.has(axis);
                  return (
                    <div key={axis} className="flex items-center gap-2">
                      <Checkbox
                        id={`axis-${axis}`}
                        checked={checked}
                        onCheckedChange={(v) =>
                          handleAxisToggle(axis, v === true)
                        }
                        aria-label={`Filter by ${AXIS_LABELS[axis] ?? axis}`}
                      />
                      <Label
                        htmlFor={`axis-${axis}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {AXIS_LABELS[axis] ?? axis}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Time range
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => update({ dateFrom: e.target.value })}
                  className="text-sm"
                  aria-label="From date"
                />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => update({ dateTo: e.target.value })}
                  className="text-sm"
                  aria-label="To date"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Source tier
              </Label>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {(["TIER_0", "TIER_1", "DISCOVERY"] as const).map((tier) => (
                  <div key={tier} className="flex items-center gap-2">
                    <Checkbox
                      id={`tier-${tier}`}
                      checked={filters.sourceTier === tier}
                      onCheckedChange={(v) =>
                        update({ sourceTier: v === true ? tier : null })
                      }
                      aria-label={`Filter by ${TIER_LABELS[tier]}`}
                    />
                    <Label
                      htmlFor={`tier-${tier}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {TIER_LABELS[tier]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Classification
              </Label>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-benchmark"
                    checked={filters.hasBenchmark === true}
                    onCheckedChange={(v) =>
                      update({ hasBenchmark: v === true ? true : null })
                    }
                  />
                  <Label
                    htmlFor="filter-benchmark"
                    className="text-sm cursor-pointer"
                  >
                    Benchmarks only
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-claim"
                    checked={filters.hasBenchmark === false}
                    onCheckedChange={(v) =>
                      update({ hasBenchmark: v === true ? false : null })
                    }
                  />
                  <Label
                    htmlFor="filter-claim"
                    className="text-sm cursor-pointer"
                  >
                    Claims only
                  </Label>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Checkbox
                  id="high-confidence"
                  checked={filters.highConfidenceOnly}
                  onCheckedChange={(v) =>
                    handleHighConfidenceToggle(v === true)
                  }
                />
                <Label
                  htmlFor="high-confidence"
                  className="text-sm cursor-pointer"
                >
                  High confidence only (≥0.7)
                </Label>
              </div>
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Min confidence: {(filters.confidenceMin * 100).toFixed(0)}%
                </Label>
                <Slider
                  value={[filters.confidenceMin * 100]}
                  onValueChange={([v]) =>
                    update({ confidenceMin: (v ?? 0) / 100 })
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
