/**
 * Add new source.
 * @see docs/features/02-source-registry.md
 */

"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SourceForm, type SourceFormSubmitPayload } from "../source-form";

export default function NewSourcePage() {
  const handleSubmit = async (values: SourceFormSubmitPayload) => {
    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        url: values.url,
        tier: values.tier,
        trustWeight: values.trustWeight,
        cadence: values.cadence,
        domainType: values.domainType,
        sourceType: values.sourceType,
        queryConfig: values.queryConfig,
        isActive: values.isActive,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to create source");
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/sources">Sources</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add source</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-xl font-semibold">Add source</h1>
      <SourceForm mode="new" onSubmit={handleSubmit} />
    </div>
  );
}
