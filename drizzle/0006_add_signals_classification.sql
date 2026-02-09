-- Add classification column to signals table
-- Stores the AI-extracted signal type: benchmark_result, policy_update, research_finding, opinion, announcement, other
ALTER TABLE "signals" ADD COLUMN "classification" text;
