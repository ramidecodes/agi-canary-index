/**
 * Admin timeline events: list, create, edit, and delete events.
 * @see docs/features/09-timeline-page.md
 */

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AXES } from "@/lib/signal/schemas";

const AXIS_LABELS: Record<string, string> = {
  reasoning: "Reasoning",
  learning_efficiency: "Learning",
  long_term_memory: "Memory",
  planning: "Planning",
  tool_use: "Tool Use",
  social_cognition: "Social",
  multimodal_perception: "Multimodal",
  robustness: "Robustness",
  alignment_safety: "Alignment",
};

const CATEGORIES = ["benchmark", "model", "policy", "research"] as const;
const EVENT_TYPES = ["reality", "fiction", "speculative"] as const;

type TimelineEventRow = {
  id: string;
  date: string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  sourceUrl: string | null;
  axesImpacted: string[] | null;
  isMilestone: boolean;
  significance: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EventFormData {
  date: string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  sourceUrl: string;
  axesImpacted: string[];
  isMilestone: boolean;
  significance: number;
}

const emptyForm: EventFormData = {
  date: new Date().toISOString().slice(0, 10),
  title: "",
  description: "",
  eventType: "reality",
  category: "model",
  sourceUrl: "",
  axesImpacted: [],
  isMilestone: false,
  significance: 1,
};

function EventForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: EventFormData;
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel: string;
}) {
  const [form, setForm] = useState<EventFormData>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAxis = (axis: string) => {
    setForm((prev) => ({
      ...prev,
      axesImpacted: prev.axesImpacted.includes(axis)
        ? prev.axesImpacted.filter((a) => a !== axis)
        : [...prev.axesImpacted, axis],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="evt-date">Date</Label>
          <Input
            id="evt-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="evt-category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v })}
          >
            <SelectTrigger id="evt-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="evt-title">Title</Label>
        <Input
          id="evt-title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          maxLength={512}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="evt-desc">Description</Label>
        <Textarea
          id="evt-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          maxLength={2000}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="evt-type">Event Type</Label>
          <Select
            value={form.eventType}
            onValueChange={(v) => setForm({ ...form, eventType: v })}
          >
            <SelectTrigger id="evt-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="evt-significance">Significance (1-5)</Label>
          <Input
            id="evt-significance"
            type="number"
            min={1}
            max={5}
            value={form.significance}
            onChange={(e) =>
              setForm({ ...form, significance: Number(e.target.value) || 1 })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="evt-source">Source URL (optional)</Label>
        <Input
          id="evt-source"
          type="url"
          value={form.sourceUrl}
          onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Axes Impacted</Label>
        <div className="flex flex-wrap gap-2">
          {AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => toggleAxis(axis)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                form.axesImpacted.includes(axis)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {AXIS_LABELS[axis] ?? axis}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="evt-milestone"
          checked={form.isMilestone}
          onCheckedChange={(v) => setForm({ ...form, isMilestone: Boolean(v) })}
        />
        <Label htmlFor="evt-milestone" className="text-sm font-normal">
          Mark as milestone (featured on timeline)
        </Label>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

export default function AdminTimelinePage() {
  const { data, error, mutate } = useSWR<{ events: TimelineEventRow[] }>(
    "/api/admin/timeline",
    fetcher,
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEventRow | null>(
    null,
  );

  const handleCreate = useCallback(
    async (formData: EventFormData) => {
      const res = await fetch("/api/admin/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create event");
        return;
      }
      toast.success("Timeline event created");
      setIsCreateOpen(false);
      mutate();
    },
    [mutate],
  );

  const handleUpdate = useCallback(
    async (formData: EventFormData) => {
      if (!editingEvent) return;
      const res = await fetch(`/api/admin/timeline/${editingEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update event");
        return;
      }
      toast.success("Timeline event updated");
      setEditingEvent(null);
      mutate();
    },
    [editingEvent, mutate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this timeline event?")) return;
      const res = await fetch(`/api/admin/timeline/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete event");
        return;
      }
      toast.success("Event deleted");
      mutate();
    },
    [mutate],
  );

  const events = data?.events ?? [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timeline Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {events.length} events total
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Add Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Timeline Event</DialogTitle>
            </DialogHeader>
            <EventForm
              initial={emptyForm}
              onSubmit={handleCreate}
              submitLabel="Create Event"
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <p className="text-destructive text-sm">
          Failed to load timeline events.
        </p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24">Category</TableHead>
              <TableHead className="w-20">Sig.</TableHead>
              <TableHead className="w-20">Milestone</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((evt) => (
              <TableRow key={evt.id}>
                <TableCell className="font-mono text-xs">{evt.date}</TableCell>
                <TableCell>
                  <span className="font-medium">{evt.title}</span>
                  {evt.sourceUrl && (
                    <a
                      href={evt.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-primary hover:underline"
                    >
                      source
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {evt.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono">
                  {evt.significance}
                </TableCell>
                <TableCell className="text-center">
                  {evt.isMilestone ? (
                    <Badge className="text-xs">Yes</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">No</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEvent(evt)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(evt.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && !error && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No timeline events yet. Click &quot;Add Event&quot; to create
                  one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={editingEvent !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEvent(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Timeline Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <EventForm
              initial={{
                date: editingEvent.date,
                title: editingEvent.title,
                description: editingEvent.description,
                eventType: editingEvent.eventType,
                category: editingEvent.category,
                sourceUrl: editingEvent.sourceUrl ?? "",
                axesImpacted: editingEvent.axesImpacted ?? [],
                isMilestone: editingEvent.isMilestone,
                significance: editingEvent.significance,
              }}
              onSubmit={handleUpdate}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
