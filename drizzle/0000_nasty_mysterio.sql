CREATE TYPE "public"."cadence" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."domain_type" AS ENUM('evaluation', 'policy', 'research', 'commentary');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('pending', 'acquired', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pipeline_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_tier" AS ENUM('TIER_0', 'TIER_1', 'DISCOVERY');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('rss', 'search', 'curated', 'api', 'x');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_type" AS ENUM('reality', 'fiction', 'speculative');--> statement-breakpoint
CREATE TABLE "canary_definitions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"axes_watched" jsonb,
	"thresholds" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canary_definitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"axis_scores" jsonb,
	"canary_statuses" jsonb,
	"coverage_score" numeric(4, 2),
	"signal_ids" uuid[],
	"notes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"raw_blob_key" varchar(512),
	"clean_blob_key" varchar(512),
	"extracted_metadata" jsonb,
	"word_count" integer,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"url" varchar(2048) NOT NULL,
	"url_hash" varchar(64) NOT NULL,
	"title" varchar(1024),
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "item_status" DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "pipeline_run_status" DEFAULT 'running' NOT NULL,
	"items_discovered" integer DEFAULT 0 NOT NULL,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"items_failed" integer DEFAULT 0 NOT NULL,
	"error_log" text,
	"scoring_version" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "pipeline_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"claim_summary" text NOT NULL,
	"axes_impacted" jsonb,
	"metric" jsonb,
	"confidence" numeric(4, 2) NOT NULL,
	"citations" jsonb,
	"scoring_version" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(512) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"tier" "source_tier" NOT NULL,
	"trust_weight" numeric(4, 2) DEFAULT '1' NOT NULL,
	"cadence" "cadence" NOT NULL,
	"domain_type" "domain_type" NOT NULL,
	"source_type" "source_type" NOT NULL,
	"query_config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_success_at" timestamp with time zone,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"title" varchar(512) NOT NULL,
	"description" text NOT NULL,
	"event_type" "timeline_event_type" NOT NULL,
	"category" varchar(128) NOT NULL,
	"source_url" varchar(2048),
	"axes_impacted" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timeline_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_snapshots_date_unique" ON "daily_snapshots" USING btree ("date");--> statement-breakpoint
CREATE INDEX "daily_snapshots_date_idx" ON "daily_snapshots" USING btree ("date");--> statement-breakpoint
CREATE INDEX "documents_item_id_idx" ON "documents" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "items_url_unique" ON "items" USING btree ("url");--> statement-breakpoint
CREATE INDEX "items_url_hash_idx" ON "items" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "items_status_idx" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "items_run_id_idx" ON "items" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "items_source_id_idx" ON "items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "signals_document_id_idx" ON "signals" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "timeline_events_date_idx" ON "timeline_events" USING btree ("date");--> statement-breakpoint
CREATE POLICY "canary_definitions_public_all" ON "canary_definitions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "daily_snapshots_public_all" ON "daily_snapshots" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "documents_public_all" ON "documents" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "items_public_all" ON "items" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pipeline_runs_public_all" ON "pipeline_runs" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "signals_public_all" ON "signals" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sources_public_all" ON "sources" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "timeline_events_public_all" ON "timeline_events" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);