-- Add milestone and significance columns to timeline_events
ALTER TABLE "timeline_events" ADD COLUMN "is_milestone" boolean NOT NULL DEFAULT false;
ALTER TABLE "timeline_events" ADD COLUMN "significance" integer NOT NULL DEFAULT 1;
