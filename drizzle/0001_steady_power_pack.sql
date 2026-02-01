CREATE TABLE "source_fetch_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"status" varchar(16) NOT NULL,
	"items_found" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_fetch_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_fetch_logs" ADD CONSTRAINT "source_fetch_logs_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fetch_logs" ADD CONSTRAINT "source_fetch_logs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_fetch_logs_run_id_idx" ON "source_fetch_logs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "source_fetch_logs_source_id_idx" ON "source_fetch_logs" USING btree ("source_id");--> statement-breakpoint
CREATE POLICY "source_fetch_logs_public_all" ON "source_fetch_logs" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);