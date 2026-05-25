CREATE TABLE "nc_user_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"site_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nc_capas" ADD COLUMN "site_id" text;--> statement-breakpoint
ALTER TABLE "nc_customer_complaints" ADD COLUMN "site_id" text;--> statement-breakpoint
ALTER TABLE "nc_user_sites" ADD CONSTRAINT "nc_user_sites_site_id_nc_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."nc_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nc_user_sites_user_site_uidx" ON "nc_user_sites" USING btree ("user_id","site_id");--> statement-breakpoint
ALTER TABLE "nc_capas" ADD CONSTRAINT "nc_capas_site_id_nc_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."nc_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nc_customer_complaints" ADD CONSTRAINT "nc_customer_complaints_site_id_nc_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."nc_sites"("id") ON DELETE no action ON UPDATE no action;