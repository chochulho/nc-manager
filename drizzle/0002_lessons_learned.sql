-- Migration: Add Lessons Learned table
-- Run: npx drizzle-kit push  (or apply manually)

CREATE TABLE IF NOT EXISTS "nc_lessons_learned" (
  "id" TEXT PRIMARY KEY,
  "org_id" TEXT NOT NULL,
  "ll_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "source_internal_nc_id" TEXT REFERENCES "nc_internal_ncs"("id") ON DELETE SET NULL,
  "source_complaint_id" TEXT REFERENCES "nc_customer_complaints"("id") ON DELETE SET NULL,
  "problem_summary" TEXT,
  "root_cause" TEXT,
  "actions_taken" TEXT,
  "key_learning" TEXT,
  "prevention_measures" TEXT,
  "applicable_areas" TEXT,
  "tags" TEXT[],
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);
