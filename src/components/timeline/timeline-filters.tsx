"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";

export interface TimelineFiltersProps {
  categories: string[];
  selectedCategories: Set<string>;
  onCategoriesChange: (categories: Set<string>) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  benchmark: "Benchmarks",
  model: "Model releases",
  policy: "Policy",
  research: "Research",
};

export function TimelineFilters({
  categories,
  selectedCategories,
  onCategoriesChange,
  searchQuery,
  onSearchChange,
}: TimelineFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const displayCategories =
    categories.length > 0
      ? categories
      : ["benchmark", "model", "policy", "research"];

  const handleCategoryToggle = useCallback(
    (cat: string, checked: boolean) => {
      const allCats = new Set(displayCategories);
      const current =
        selectedCategories.size === 0 ? allCats : selectedCategories;
      const next = new Set(current);
      if (checked) next.add(cat);
      else next.delete(cat);
      onCategoriesChange(next.size === allCats.size ? new Set() : next);
    },
    [selectedCategories, onCategoriesChange, displayCategories],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearchChange(localSearch.trim());
    },
    [localSearch, onSearchChange],
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-wrap gap-4 items-center">
        {displayCategories.map((cat) => {
          const label = CATEGORY_LABELS[cat] ?? cat;
          const checked =
            selectedCategories.size === 0 || selectedCategories.has(cat);
          return (
            <div key={cat} className="flex items-center gap-2">
              <Checkbox
                id={`filter-${cat}`}
                checked={checked}
                onCheckedChange={(v) => handleCategoryToggle(cat, v === true)}
                aria-label={`Filter by ${label}`}
              />
              <Label
                htmlFor={`filter-${cat}`}
                className="text-sm font-normal cursor-pointer"
              >
                {label}
              </Label>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={handleSearchSubmit}
        className="flex gap-2 w-full sm:w-auto"
      >
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search events..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8 pr-8"
            aria-label="Search timeline events"
          />
          {localSearch && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>
    </div>
  );
}
