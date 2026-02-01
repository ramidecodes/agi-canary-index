/**
 * GET /api/signals/export?format=csv|json&filters...
 * Exports filtered signals as CSV or JSON.
 * Cap: 10,000 rows. Same filters as GET /api/signals.
 * @see docs/features/10-signal-explorer.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  parseExplorerFilters,
  querySignalsExplorer,
  type SignalExplorerResult,
} from "@/lib/signals/query";

export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 10_000;

function toCsv(signals: SignalExplorerResult[]): string {
  const headers = [
    "id",
    "createdAt",
    "claimSummary",
    "axesImpacted",
    "confidence",
    "classification",
    "metric",
    "sourceName",
    "sourceTier",
    "title",
    "url",
  ];
  const escapeCsv = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = signals.map((s) =>
    headers
      .map((h) => {
        const val = s[h as keyof SignalExplorerResult];
        if (h === "axesImpacted" && Array.isArray(val)) {
          return escapeCsv(
            val.map((a) => `${a.axis}:${a.magnitude}`).join("; ")
          );
        }
        if (h === "metric" && val && typeof val === "object") {
          return escapeCsv(
            `${(val as { name: string; value: number; unit?: string }).name}: ${
              (val as { name: string; value: number; unit?: string }).value
            }`
          );
        }
        return escapeCsv(val);
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";
    if (format !== "csv" && format !== "json") {
      return NextResponse.json(
        { error: "format must be csv or json" },
        { status: 400 }
      );
    }

    const filters = parseExplorerFilters(searchParams);
    filters.limit = Math.min(filters.limit ?? 100, MAX_EXPORT_ROWS);
    filters.offset = 0;

    const db = getDb();
    const { signals: list } = await querySignalsExplorer(db, filters);

    if (format === "csv") {
      const csv = toCsv(list);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="signals-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      });
    }

    const json = JSON.stringify({ signals: list }, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="signals-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("[api/signals/export]", err);
    return NextResponse.json(
      { error: "Failed to export signals" },
      { status: 500 }
    );
  }
}
