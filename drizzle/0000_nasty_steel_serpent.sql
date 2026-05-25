CREATE TABLE "nc_categories_l2" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"code" text NOT NULL,
	"name_ko" text NOT NULL,
	"name_en" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_categories_l3" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"parent_l2_id" text NOT NULL,
	"code" text NOT NULL,
	"name_ko" text NOT NULL,
	"name_en" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"initial_response_sla_hours" integer DEFAULT 24,
	"containment_sla_hours" integer DEFAULT 48,
	"final_report_sla_days" integer DEFAULT 15,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"part_number" text NOT NULL,
	"part_name" text NOT NULL,
	"customer_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_processes" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"site_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_approval_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"step" integer NOT NULL,
	"approver_id" text NOT NULL,
	"action" text NOT NULL,
	"comment" text,
	"acted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "nc_approval_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"name" text NOT NULL,
	"steps" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_capa_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"capa_id" text NOT NULL,
	"action_type" text NOT NULL,
	"description" text NOT NULL,
	"responsible_user_id" text,
	"due_at" timestamp,
	"completed_at" timestamp,
	"evidence" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_capas" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"capa_number" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"methodology" text DEFAULT '8d' NOT NULL,
	"title" text NOT NULL,
	"problem_statement" text,
	"d1_team" jsonb,
	"d2_description" text,
	"d3_interim_containment" text,
	"d4_root_cause" jsonb,
	"d5_permanent_actions" jsonb,
	"d6_implementation" jsonb,
	"d7_prevention" jsonb,
	"d8_recognition" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"champion_user_id" text,
	"effectiveness_review_due_at" timestamp,
	"effectiveness_reviewed_at" timestamp,
	"effectiveness_verdict" text,
	"effectiveness_note" text,
	"recurrence_confirmed" boolean,
	"recurrence_note" text,
	"fmea_ref" text,
	"change_ref" text,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_customer_complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"complaint_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer_site_name" text,
	"customer_reference" text,
	"received_at" timestamp NOT NULL,
	"received_channel" text NOT NULL,
	"is_formal" boolean DEFAULT true NOT NULL,
	"received_by_user_id" text NOT NULL,
	"discovery_stage" text NOT NULL,
	"part_id" text,
	"lot_number" text,
	"quantity_claimed" numeric,
	"quantity_confirmed" numeric,
	"category_l2_id" text,
	"category_l3_id" text,
	"tags" text[],
	"title" text NOT NULL,
	"customer_description" text,
	"severity" text NOT NULL,
	"safety_related" boolean DEFAULT false NOT NULL,
	"recall_risk" boolean DEFAULT false NOT NULL,
	"initial_response_due_at" timestamp,
	"initial_response_sent_at" timestamp,
	"containment_due_at" timestamp,
	"contained_at" timestamp,
	"final_report_due_at" timestamp,
	"final_report_sent_at" timestamp,
	"status" text DEFAULT 'received' NOT NULL,
	"resolution_type" text,
	"capa_id" text,
	"cost_recall_return" numeric,
	"cost_penalty" numeric,
	"cost_other" numeric,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_horizontal_deployments" (
	"id" text PRIMARY KEY NOT NULL,
	"capa_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_internal_ncs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"nc_number" text NOT NULL,
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
CREATE TABLE "nc_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_analysis_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"complaint_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sections" jsonb NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_defect_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"recipient_emails" text[] NOT NULL,
	"sent_by_user_id" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nc_field_claim_details" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"complaint_id" text NOT NULL,
	"vehicle_model" text,
	"vehicle_vin" text,
	"manufactured_at" timestamp,
	"region" text,
	"dealer_name" text,
	"mileage_km" numeric,
	"usage_months" integer,
	"dtc_codes" text[],
	"symptom_description" text,
	"extra_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nc_field_claim_details_complaint_id_unique" UNIQUE("complaint_id")
);
--> statement-breakpoint
CREATE TABLE "nc_sequences" (
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"year" integer NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "nc_sequences_org_id_entity_type_year_pk" PRIMARY KEY("org_id","entity_type","year")
);
--> statement-breakpoint
CREATE TABLE "nc_sla_reminder_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"sent_to_email" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nc_categories_l3" ADD CONSTRAINT "nc_categories_l3_parent_l2_id_nc_categories_l2_id_fk" FOREIGN KEY ("parent_l2_id") REFERENCES "public"."nc_categories_l2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_approval_actions" ADD CONSTRAINT "nc_approval_actions_request_id_nc_approval_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."nc_approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_approval_requests" ADD CONSTRAINT "nc_approval_requests_workflow_id_nc_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."nc_approval_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_capa_actions" ADD CONSTRAINT "nc_capa_actions_capa_id_nc_capas_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."nc_capas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_customer_complaints" ADD CONSTRAINT "nc_customer_complaints_customer_id_nc_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."nc_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_customer_complaints" ADD CONSTRAINT "nc_customer_complaints_part_id_nc_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."nc_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_customer_complaints" ADD CONSTRAINT "nc_customer_complaints_category_l2_id_nc_categories_l2_id_fk" FOREIGN KEY ("category_l2_id") REFERENCES "public"."nc_categories_l2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_customer_complaints" ADD CONSTRAINT "nc_customer_complaints_category_l3_id_nc_categories_l3_id_fk" FOREIGN KEY ("category_l3_id") REFERENCES "public"."nc_categories_l3"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_horizontal_deployments" ADD CONSTRAINT "nc_horizontal_deployments_capa_id_nc_capas_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."nc_capas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_discovered_by_site_id_nc_sites_id_fk" FOREIGN KEY ("discovered_by_site_id") REFERENCES "public"."nc_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_discovered_by_process_id_nc_processes_id_fk" FOREIGN KEY ("discovered_by_process_id") REFERENCES "public"."nc_processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_occurrence_site_id_nc_sites_id_fk" FOREIGN KEY ("occurrence_site_id") REFERENCES "public"."nc_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_occurrence_process_id_nc_processes_id_fk" FOREIGN KEY ("occurrence_process_id") REFERENCES "public"."nc_processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_occurrence_supplier_id_nc_suppliers_id_fk" FOREIGN KEY ("occurrence_supplier_id") REFERENCES "public"."nc_suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_part_id_nc_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."nc_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_category_l2_id_nc_categories_l2_id_fk" FOREIGN KEY ("category_l2_id") REFERENCES "public"."nc_categories_l2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_internal_ncs" ADD CONSTRAINT "nc_internal_ncs_category_l3_id_nc_categories_l3_id_fk" FOREIGN KEY ("category_l3_id") REFERENCES "public"."nc_categories_l3"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_analysis_reports" ADD CONSTRAINT "nc_analysis_reports_complaint_id_nc_customer_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."nc_customer_complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_field_claim_details" ADD CONSTRAINT "nc_field_claim_details_complaint_id_nc_customer_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."nc_customer_complaints"("id") ON DELETE cascade ON UPDATE no action;