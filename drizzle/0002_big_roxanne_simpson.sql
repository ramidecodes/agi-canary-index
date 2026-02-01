ALTER TABLE "items" ADD COLUMN "acquisition_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "acquisition_error" text;