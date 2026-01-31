/**
 * Edit source by ID.
 * @see docs/features/02-source-registry.md
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SourceForm,
  type SourceFormValues,
  type SourceFormSubmitPayload,
} from "../../source-form";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Source = {
  id: string;
  name: string;
  url: string;
  tier: string;
  trustWeight: string;
  cadence: string;
  domainType: string;
  sourceType: string;
  queryConfig: Record<string, unknown> | null;
  isActive: boolean;
};

export default function EditSourcePage() {
  const params = useParams();
  const id = params?.id as string;
  const {
    data: sources,
    error,
    isLoading,
  } = useSWR<Source[]>(id ? "/api/admin/sources" : null, fetcher);
  const sourceFromList = sources?.find((s) => s.id === id);

  const handleSubmit = async (values: SourceFormSubmitPayload) => {
    const res = await fetch(`/api/admin/sources/${id}`, {
      method: "PATCH",
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
      throw new Error(data.error ?? "Failed to update source");
    }
  };

  if (!id) {
    return <div className="text-destructive">Missing source ID.</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load source: {String(error)}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Loading…
      </div>
    );
  }

  if (sources && !sourceFromList) {
    return (
      <div className="text-amber-600 dark:text-amber-400">
        Source not found. It may have been deleted.
      </div>
    );
  }

  if (!sourceFromList) {
    return null;
  }

  const initialValues: Partial<SourceFormValues> = {
    name: sourceFromList.name,
    url: sourceFromList.url,
    tier: sourceFromList.tier as SourceFormValues["tier"],
    trustWeight: sourceFromList.trustWeight,
    cadence: sourceFromList.cadence as SourceFormValues["cadence"],
    domainType: sourceFromList.domainType as SourceFormValues["domainType"],
    sourceType: sourceFromList.sourceType as SourceFormValues["sourceType"],
    queryConfig:
      sourceFromList.queryConfig != null
        ? JSON.stringify(sourceFromList.queryConfig, null, 2)
        : "{}",
    isActive: sourceFromList.isActive,
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
            <BreadcrumbPage>{sourceFromList.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-xl font-semibold">Edit source</h1>
      <SourceForm
        mode="edit"
        sourceId={id}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
