import {
  pgTable, text, timestamp, boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  plantName: text("plant_name"),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const orgInvitations = pgTable("org_invitations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  status: text("status", { enum: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"] }).default("PENDING").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  invitedById: text("invited_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Relations ──
export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  createdBy: one(users, { fields: [organizations.createdById], references: [users.id] }),
  members: many(users),
  invitations: many(orgInvitations),
}));

export const orgInvitationsRelations = relations(orgInvitations, ({ one }) => ({
  organization: one(organizations, { fields: [orgInvitations.organizationId], references: [organizations.id] }),
  invitedBy: one(users, { fields: [orgInvitations.invitedById], references: [users.id] }),
}));
