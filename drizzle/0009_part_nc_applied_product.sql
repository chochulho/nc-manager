-- Applied to the live DB via `drizzle-kit push` (not `db:migrate`), consistent with 0002-0008.
-- Hand-curated record of the actual DDL applied for the part_nc "적용 제품" (applied product)
-- free-text field, added alongside wiring the existing (previously unused in this UI)
-- occurrence_process_id column as "사용 공정" (usage process) on the Part NC detail page.

ALTER TABLE "nc_part_ncs" ADD COLUMN "applied_product" text;
