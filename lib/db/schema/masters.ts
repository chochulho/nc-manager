import {
  pgTable, text, timestamp, integer, boolean, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const ncSites = pgTable("nc_sites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ncCustomers = pgTable("nc_customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  initialResponseSlaHours: integer("initial_response_sla_hours").default(24),
  containmentSlaHours: integer("containment_sla_hours").default(48),
  finalReportSlaDays: integer("final_report_sla_days").default(15),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ncSuppliers = pgTable("nc_suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ncParts = pgTable("nc_parts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  partNumber: text("part_number").notNull(),
  partName: text("part_name").notNull(),
  customerId: text("customer_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ncProcesses = pgTable("nc_processes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  siteId: text("site_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ncCategoriesL2 = pgTable("nc_categories_l2", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id"),
  code: text("code").notNull(),
  nameKo: text("name_ko").notNull(),
  nameEn: text("name_en").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ncCategoriesL3 = pgTable("nc_categories_l3", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id"),
  parentL2Id: text("parent_l2_id").notNull().references(() => ncCategoriesL2.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  nameKo: text("name_ko").notNull(),
  nameEn: text("name_en").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── User-Site Access Mapping ────────────────────────────────────────────────
// 사용자별 접근 가능한 사업장 목록 (NC Manager 자체 권한 테이블)
// orgRole=ADMIN 또는 isAdmin인 경우 이 테이블을 무시하고 전체 접근

export const ncUserSites = pgTable("nc_user_sites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),   // Supabase auth user UUID
  orgId: text("org_id").notNull(),
  siteId: text("site_id").notNull().references(() => ncSites.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("nc_user_sites_user_site_uidx").on(t.userId, t.siteId),
]);

// ── Relations ──
export const ncPartsRelations = relations(ncParts, ({ one }) => ({
  customer: one(ncCustomers, { fields: [ncParts.customerId], references: [ncCustomers.id] }),
}));

export const ncProcessesRelations = relations(ncProcesses, ({ one }) => ({
  site: one(ncSites, { fields: [ncProcesses.siteId], references: [ncSites.id] }),
}));

export const ncCategoriesL2Relations = relations(ncCategoriesL2, ({ many }) => ({
  children: many(ncCategoriesL3),
}));

export const ncCategoriesL3Relations = relations(ncCategoriesL3, ({ one }) => ({
  parent: one(ncCategoriesL2, { fields: [ncCategoriesL3.parentL2Id], references: [ncCategoriesL2.id] }),
}));
