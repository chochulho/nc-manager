-- Applied to the live DB via `drizzle-kit push` (not `db:migrate`), consistent with how
-- 0002-0007 were applied — see drizzle/meta/_journal.json, which only tracks 0000-0001.
-- `drizzle-kit generate` was NOT usable here: since the journal/snapshot history stops at
-- 0001, it diffs against that stale snapshot and re-declares nc_lessons_learned/nc_q_alerts
-- (and other 0002-0007 columns) as new CREATE TABLE/ADD COLUMN statements, even though they
-- already exist in the live DB. This file is a hand-curated record of the actual DDL applied
-- for the part_nc feature only, verified against the live DB after push.

CREATE TABLE "nc_part_ncs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"pnc_number" text NOT NULL,
	"discovered_at" timestamp NOT NULL,
	"discovery_stage" text NOT NULL,
	"discovered_by_site_id" text,
	"discovered_by_process_id" text,
	"discovered_by_user_id" text NOT NULL,
	"occurrence_site_id" text,
	"occurrence_process_id" text,
	"occurrence_supplier_id" text,
	"part_id" text,
	"lot_number" text,
	"quantity_inspected" numeric,
	"quantity_nc" numeric,
	"category_l2_id" text,
	"category_l3_id" text,
	"tags" text[],
	"title" text NOT NULL,
	"description" text,
	"severity" text NOT NULL,
	"safety_related" boolean DEFAULT false NOT NULL,
	"regulatory_related" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"containment_location" text,
	"containment_quantity" numeric,
	"contained_at" timestamp,
	"contained_by_user_id" text,
	"disposition_type" text,
	"disposition_approved_by_user_id" text,
	"disposition_approved_at" timestamp,
	"disposition_notes" text,
	"capa_id" text,
	"capa_required" boolean DEFAULT false NOT NULL,
	"cost_scrap" numeric,
	"cost_rework" numeric,
	"cost_other" numeric,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nc_lessons_learned" ADD COLUMN "source_part_nc_id" text;
--> statement-breakpoint
ALTER TABLE "nc_lessons_learned" ADD CONSTRAINT "nc_lessons_learned_source_part_nc_id_nc_part_ncs_id_fk" FOREIGN KEY ("source_part_nc_id") REFERENCES "public"."nc_part_ncs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_discovered_by_site_id_nc_sites_id_fk" FOREIGN KEY ("discovered_by_site_id") REFERENCES "public"."nc_sites"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_discovered_by_process_id_nc_processes_id_fk" FOREIGN KEY ("discovered_by_process_id") REFERENCES "public"."nc_processes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_occurrence_site_id_nc_sites_id_fk" FOREIGN KEY ("occurrence_site_id") REFERENCES "public"."nc_sites"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_occurrence_process_id_nc_processes_id_fk" FOREIGN KEY ("occurrence_process_id") REFERENCES "public"."nc_processes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_occurrence_supplier_id_nc_suppliers_id_fk" FOREIGN KEY ("occurrence_supplier_id") REFERENCES "public"."nc_suppliers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_part_id_nc_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."nc_parts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_category_l2_id_nc_categories_l2_id_fk" FOREIGN KEY ("category_l2_id") REFERENCES "public"."nc_categories_l2"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nc_part_ncs" ADD CONSTRAINT "nc_part_ncs_category_l3_id_nc_categories_l3_id_fk" FOREIGN KEY ("category_l3_id") REFERENCES "public"."nc_categories_l3"("id") ON DELETE no action ON UPDATE no action;
