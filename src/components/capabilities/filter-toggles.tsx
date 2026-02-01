"use client";

import { useCapabilityProfileStore } from "@/lib/capabilities/store";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FilterToggles() {
  const { filters, setFilters } = useCapabilityProfileStore();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="benchmarks-only"
            checked={filters.benchmarksOnly}
            onCheckedChange={(checked) =>
              setFilters({ benchmarksOnly: checked === true })
            }
          />
          <Label
            htmlFor="benchmarks-only"
            className="text-sm font-normal cursor-pointer"
          >
            Benchmarks only
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-claims"
            checked={filters.includeClaims}
            onCheckedChange={(checked) =>
              setFilters({ includeClaims: checked === true })
            }
          />
          <Label
            htmlFor="include-claims"
            className="text-sm font-normal cursor-pointer"
          >
            Include claims
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-speculative"
            checked={filters.showSpeculative}
            onCheckedChange={(checked) =>
              setFilters({ showSpeculative: checked === true })
            }
          />
          <Label
            htmlFor="show-speculative"
            className="text-sm font-normal cursor-pointer"
          >
            Show speculative
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
