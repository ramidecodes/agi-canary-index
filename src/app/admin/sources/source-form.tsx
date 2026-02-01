/**
 * Shared source form: add and edit with test fetch.
 * @see docs/features/02-source-registry.md
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TIER_OPTIONS = ["TIER_0", "TIER_1", "DISCOVERY"] as const;
const CADENCE_OPTIONS = ["daily", "weekly", "monthly"] as const;
const DOMAIN_OPTIONS = [
  "evaluation",
  "policy",
  "research",
  "commentary",
] as const;
const SOURCE_TYPE_OPTIONS = ["rss", "search", "curated", "api"] as const;

export type SourceFormValues = {
  name: string;
  url: string;
  tier: (typeof TIER_OPTIONS)[number];
  trustWeight: string;
  cadence: (typeof CADENCE_OPTIONS)[number];
  domainType: (typeof DOMAIN_OPTIONS)[number];
  sourceType: (typeof SOURCE_TYPE_OPTIONS)[number];
  queryConfig: string;
  isActive: boolean;
};

/** Payload sent to API (queryConfig as object). */
export type SourceFormSubmitPayload = Omit<SourceFormValues, "queryConfig"> & {
  queryConfig?: Record<string, unknown>;
};

const defaultValues: SourceFormValues = {
  name: "",
  url: "",
  tier: "TIER_1",
  trustWeight: "0.7",
  cadence: "weekly",
  domainType: "commentary",
  sourceType: "rss",
  queryConfig: "{}",
  isActive: true,
};

type Props = {
  mode: "new" | "edit";
  sourceId?: string;
  initialValues?: Partial<SourceFormValues>;
  onSubmit: (values: SourceFormSubmitPayload) => Promise<void>;
};

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function SourceForm({ mode, initialValues, onSubmit }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<SourceFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof SourceFormValues, value: string | boolean) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setTestResult(null);
      setError(null);
    },
    [],
  );

  const handleTestFetch = useCallback(async () => {
    if (!values.url.trim()) {
      setTestResult({ ok: false, error: "URL is required" });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/sources/test-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: values.url.trim(),
          sourceType: values.sourceType,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          ok: true,
          message: data.message ?? "Fetch succeeded.",
        });
      } else {
        setTestResult({
          ok: false,
          error: data.error ?? `HTTP ${data.status ?? "error"}`,
        });
      }
    } catch (e) {
      setTestResult({
        ok: false,
        error: e instanceof Error ? e.message : "Test fetch failed",
      });
    } finally {
      setTestLoading(false);
    }
  }, [values.url, values.sourceType]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitLoading(true);
      try {
        let queryConfig: Record<string, unknown> | undefined;
        try {
          const parsed = JSON.parse(values.queryConfig.trim() || "{}");
          queryConfig =
            typeof parsed === "object" && parsed !== null ? parsed : undefined;
        } catch {
          setError("Query config must be valid JSON");
          return;
        }
        const payload = {
          ...values,
          trustWeight: String(Number(values.trustWeight)),
          queryConfig,
        };
        await onSubmit(payload);
        router.push("/admin/sources");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSubmitLoading(false);
      }
    },
    [values, onSubmit, router],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormField label="Name *" htmlFor="name">
        <Input
          id="name"
          type="text"
          required
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </FormField>

      <FormField label="URL *" htmlFor="url">
        <Input
          id="url"
          type="url"
          required
          value={values.url}
          onChange={(e) => handleChange("url", e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tier" htmlFor="tier">
          <Select
            value={values.tier}
            onValueChange={(v) =>
              handleChange("tier", v as SourceFormValues["tier"])
            }
          >
            <SelectTrigger id="tier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Trust weight (0–1)" htmlFor="trustWeight">
          <Input
            id="trustWeight"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={values.trustWeight}
            onChange={(e) => handleChange("trustWeight", e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cadence" htmlFor="cadence">
          <Select
            value={values.cadence}
            onValueChange={(v) =>
              handleChange("cadence", v as SourceFormValues["cadence"])
            }
          >
            <SelectTrigger id="cadence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CADENCE_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Domain type" htmlFor="domainType">
          <Select
            value={values.domainType}
            onValueChange={(v) =>
              handleChange("domainType", v as SourceFormValues["domainType"])
            }
          >
            <SelectTrigger id="domainType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOMAIN_OPTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Source type" htmlFor="sourceType">
        <Select
          value={values.sourceType}
          onValueChange={(v) =>
            handleChange("sourceType", v as SourceFormValues["sourceType"])
          }
        >
          <SelectTrigger id="sourceType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Query config (JSON, optional)" htmlFor="queryConfig">
        <Textarea
          id="queryConfig"
          rows={3}
          value={values.queryConfig}
          onChange={(e) => handleChange("queryConfig", e.target.value)}
          placeholder='{"keywords": ["AI"], "domains": []}'
          className="font-mono"
        />
      </FormField>

      <div className="flex items-center gap-2 space-y-0">
        <Checkbox
          id="isActive"
          checked={values.isActive}
          onCheckedChange={(c) => handleChange("isActive", c === true)}
        />
        <Label htmlFor="isActive" className="cursor-pointer font-normal">
          Active (included in pipeline runs)
        </Label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestFetch}
          disabled={testLoading || !values.url.trim()}
        >
          {testLoading ? "Testing…" : "Test fetch"}
        </Button>
        {testResult && (
          <span
            className={
              testResult.ok
                ? "text-sm text-emerald-600 dark:text-emerald-400"
                : "text-sm text-destructive"
            }
          >
            {testResult.ok ? testResult.message : testResult.error}
          </span>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitLoading}>
          {submitLoading ? "Saving…" : mode === "new" ? "Add source" : "Save"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/sources">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
