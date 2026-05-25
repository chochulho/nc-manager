import {
  pgTable, text, timestamp, boolean, numeric, jsonb, integer, primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  ncSites, ncProcesses, ncSuppliers, ncParts, ncCustomers,
  ncCategoriesL2, ncCategoriesL3,
} from "./masters";

// ── Internal NC ──────────────────────────────────────────────────────────────

export const internalNCs = pgTable("nc_internal_ncs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  ncNumber: text("nc_number").notNull(),

  discoveredAt: timestamp("discovered_at", { mode: "date" }).notNull(),
  discoveryStage: text("discovery_stage", {
    enum: ["incoming", "in_process", "outgoing", "internal_audit", "msa", "other"],
  }).notNull(),
  discoveredBySiteId: text("discovered_by_site_id").references(() => ncSites.id),
  discoveredByProcessId: text("discovered_by_process_id").references(() => ncProcesses.id),
  discoveredByUserId: text("discovered_by_user_id").notNull(),

  occurrenceSiteId: text("occurrence_site_id").references(() => ncSites.id),
  occurrenceProcessId: text("occurrence_process_id").references(() => ncProcesses.id),
  occurrenceSupplierId: text("occurrence_supplier_id").references(() => ncSuppliers.id),

  partId: text("part_id").references(() => ncParts.id),
  lotNumber: text("lot_number"),
  quantityInspected: numeric("quantity_inspected"),
  quantityNc: numeric("quantity_nc"),

  categoryL2Id: text("category_l2_id").references(() => ncCategoriesL2.id),
  categoryL3Id: text("category_l3_id").references(() => ncCategoriesL3.id),
  tags: text("tags").array(),

  title: text("title").notNull(),
  description: text("description"),

  severity: text("severity", { enum: ["critical", "major", "minor"] }).notNull(),
  safetyRelated: boolean("safety_related").default(false).notNull(),
  regulatoryRelated: boolean("regulatory_related").default(false).notNull(),

  status: text("status", {
    enum: ["open", "contained", "disposition_decided", "capa_in_progress", "closed"],
  }).default("open").notNull(),

  containmentLocation: text("containment_location"),
  containmentQuantity: numeric("containment_quantity"),
  containedAt: timestamp("contained_at", { mode: "date" }),
  containedByUserId: text("contained_by_user_id"),

  dispositionType: text("disposition_type", {
    enum: ["rework", "deviation", "scrap", "return_to_supplier", "use_as_is"],
  }),
  dispositionApprovedByUserId: text("disposition_approved_by_user_id"),
  dispositionApprovedAt: timestamp("disposition_approved_at", { mode: "date" }),
  dispositionNotes: text("disposition_notes"),

  capaId: text("capa_id"),
  capaRequired: boolean("capa_required").default(false).notNull(),

  costScrap: numeric("cost_scrap"),
  costRework: numeric("cost_rework"),
  costOther: numeric("cost_other"),

  closedAt: timestamp("closed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Customer Complaint ────────────────────────────────────────────────────────

export const customerComplaints = pgTable("nc_customer_complaints", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  complaintNumber: text("complaint_number").notNull(),

  siteId: text("site_id").references(() => ncSites.id),  // 접수/처리 사업장 (접근 제어 기준)
  customerId: text("customer_id").notNull().references(() => ncCustomers.id),
  customerSiteName: text("customer_site_name"),
  customerReference: text("customer_reference"),

  receivedAt: timestamp("received_at", { mode: "date" }).notNull(),
  receivedChannel: text("received_channel", {
    enum: ["portal", "email", "phone", "meeting", "informal"],
  }).notNull(),
  isFormal: boolean("is_formal").default(true).notNull(),
  receivedByUserId: text("received_by_user_id").notNull(),

  discoveryStage: text("discovery_stage", {
    enum: ["inline_0km", "field", "warranty", "other"],
  }).notNull(),

  partId: text("part_id").references(() => ncParts.id),
  lotNumber: text("lot_number"),
  quantityClaimed: numeric("quantity_claimed"),
  quantityConfirmed: numeric("quantity_confirmed"),

  categoryL2Id: text("category_l2_id").references(() => ncCategoriesL2.id),
  categoryL3Id: text("category_l3_id").references(() => ncCategoriesL3.id),
  tags: text("tags").array(),

  title: text("title").notNull(),
  customerDescription: text("customer_description"),

  severity: text("severity", { enum: ["critical", "major", "minor"] }).notNull(),
  safetyRelated: boolean("safety_related").default(false).notNull(),
  recallRisk: boolean("recall_risk").default(false).notNull(),

  initialResponseDueAt: timestamp("initial_response_due_at", { mode: "date" }),
  initialResponseSentAt: timestamp("initial_response_sent_at", { mode: "date" }),
  containmentDueAt: timestamp("containment_due_at", { mode: "date" }),
  containedAt: timestamp("contained_at", { mode: "date" }),
  finalReportDueAt: timestamp("final_report_due_at", { mode: "date" }),
  finalReportSentAt: timestamp("final_report_sent_at", { mode: "date" }),

  status: text("status", {
    enum: ["received", "acknowledged", "contained", "investigating", "8d_in_progress", "final_reported", "closed", "closed_ntf"],
  }).default("received").notNull(),
  resolutionType: text("resolution_type", {
    enum: ["confirmed_nc", "ntf", "customer_misuse", "partial"],
  }),

  capaId: text("capa_id"),

  costRecallReturn: numeric("cost_recall_return"),
  costPenalty: numeric("cost_penalty"),
  costOther: numeric("cost_other"),

  closedAt: timestamp("closed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── CAPA ─────────────────────────────────────────────────────────────────────

export const capas = pgTable("nc_capas", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  capaNumber: text("capa_number").notNull(),

  siteId: text("site_id").references(() => ncSites.id),  // 상위 NC/Complaint에서 복사 (접근 제어 기준)
  sourceType: text("source_type", {
    enum: ["internal_nc", "customer_complaint", "audit", "change", "gauge", "other"],
  }).notNull(),
  sourceId: text("source_id").notNull(),

  methodology: text("methodology", { enum: ["8d", "simple_capa", "a3"] }).default("8d").notNull(),

  title: text("title").notNull(),
  problemStatement: text("problem_statement"),

  d1Team: jsonb("d1_team"),
  d2Description: text("d2_description"),
  d3InterimContainment: text("d3_interim_containment"),
  d4RootCause: jsonb("d4_root_cause"),
  d5PermanentActions: jsonb("d5_permanent_actions"),
  d6Implementation: jsonb("d6_implementation"),
  d7Prevention: jsonb("d7_prevention"),
  d8Recognition: jsonb("d8_recognition"),

  status: text("status", {
    enum: ["open", "in_progress", "actions_implemented", "effectiveness_monitoring", "closed"],
  }).default("open").notNull(),

  championUserId: text("champion_user_id"),

  effectivenessReviewDueAt: timestamp("effectiveness_review_due_at", { mode: "date" }),
  effectivenessReviewedAt: timestamp("effectiveness_reviewed_at", { mode: "date" }),
  effectivenessVerdict: text("effectiveness_verdict", {
    enum: ["effective", "not_effective", "partial"],
  }),
  effectivenessNote: text("effectiveness_note"),
  recurrenceConfirmed: boolean("recurrence_confirmed"),
  recurrenceNote: text("recurrence_note"),

  fmeaRef: text("fmea_ref"),
  changeRef: text("change_ref"),

  closedAt: timestamp("closed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const capaActions = pgTable("nc_capa_actions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  capaId: text("capa_id").notNull().references(() => capas.id, { onDelete: "cascade" }),
  actionType: text("action_type", { enum: ["correction", "corrective", "preventive"] }).notNull(),
  description: text("description").notNull(),
  responsibleUserId: text("responsible_user_id"),
  dueAt: timestamp("due_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  evidence: text("evidence"),
  status: text("status", { enum: ["open", "in_progress", "completed", "cancelled"] }).default("open").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const horizontalDeployments = pgTable("nc_horizontal_deployments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  capaId: text("capa_id").notNull().references(() => capas.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["part", "process", "supplier", "customer", "site"] }).notNull(),
  targetId: text("target_id").notNull(),
  status: text("status", { enum: ["open", "applied"] }).default("open").notNull(),
  appliedAt: timestamp("applied_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Approval Workflow ─────────────────────────────────────────────────────────

export const approvalWorkflows = pgTable("nc_approval_workflows", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  entityType: text("entity_type", { enum: ["internal_nc_disposition", "capa_close", "complaint_close"] }).notNull(),
  name: text("name").notNull(),
  steps: jsonb("steps").notNull().$type<Array<{ order: number; role: string; label: string }>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const approvalRequests = pgTable("nc_approval_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId: text("workflow_id").notNull().references(() => approvalWorkflows.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  currentStep: integer("current_step").default(0).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "cancelled"] }).default("pending").notNull(),
  requestedById: text("requested_by_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
});

export const approvalActions = pgTable("nc_approval_actions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestId: text("request_id").notNull().references(() => approvalRequests.id, { onDelete: "cascade" }),
  step: integer("step").notNull(),
  approverId: text("approver_id").notNull(),
  action: text("action", { enum: ["approved", "rejected", "requested_changes"] }).notNull(),
  comment: text("comment"),
  actedAt: timestamp("acted_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Attachments & Activity Log ────────────────────────────────────────────────

export const ncAttachments = pgTable("nc_attachments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  entityType: text("entity_type", { enum: ["internal_nc", "customer_complaint", "capa", "lessons_learned"] }).notNull(),
  entityId: text("entity_id").notNull(),
  uploadedById: text("uploaded_by_id").notNull(),
  filename: text("filename").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ncActivities = pgTable("nc_activities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  entityType: text("entity_type", { enum: ["internal_nc", "customer_complaint", "capa", "lessons_learned"] }).notNull(),
  entityId: text("entity_id").notNull(),
  userId: text("user_id"),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Field Claim Details ───────────────────────────────────────────────────────

export const ncFieldClaimDetails = pgTable("nc_field_claim_details", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  complaintId: text("complaint_id").notNull().unique().references(() => customerComplaints.id, { onDelete: "cascade" }),
  vehicleModel: text("vehicle_model"),
  vehicleVin: text("vehicle_vin"),
  manufacturedAt: timestamp("manufactured_at", { mode: "date" }),
  region: text("region"),
  dealerName: text("dealer_name"),
  mileageKm: numeric("mileage_km"),
  usageMonths: integer("usage_months"),
  dtcCodes: text("dtc_codes").array(),
  symptomDescription: text("symptom_description"),
  extraData: jsonb("extra_data"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Analysis Reports ──────────────────────────────────────────────────────────

export const ncAnalysisReports = pgTable("nc_analysis_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  complaintId: text("complaint_id").notNull().references(() => customerComplaints.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["draft", "final"] }).default("draft").notNull(),
  sections: jsonb("sections").notNull().$type<{
    problemDescription: string;
    immediateContainment: string;
    rootCause: string;
    permanentActions: string;
    prevention: string;
    conclusion: string;
  }>(),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Defect Notifications ──────────────────────────────────────────────────────

export const ncDefectNotifications = pgTable("nc_defect_notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  entityType: text("entity_type", { enum: ["internal_nc", "customer_complaint"] }).notNull(),
  entityId: text("entity_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientEmails: text("recipient_emails").array().notNull(),
  sentByUserId: text("sent_by_user_id").notNull(),
  sentAt: timestamp("sent_at", { mode: "date" }).defaultNow().notNull(),
});

// ── SLA Reminder Logs ─────────────────────────────────────────────────────────

export const ncSlaReminderLogs = pgTable("nc_sla_reminder_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  entityType: text("entity_type", {
    enum: ["complaint_initial", "complaint_final", "capa_action"],
  }).notNull(),
  entityId: text("entity_id").notNull(),
  sentToEmail: text("sent_to_email").notNull(),
  sentAt: timestamp("sent_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Sequence counters ─────────────────────────────────────────────────────────

export const ncSequences = pgTable("nc_sequences", {
  orgId: text("org_id").notNull(),
  entityType: text("entity_type", { enum: ["internal_nc", "customer_complaint", "capa", "lessons_learned"] }).notNull(),
  year: integer("year").notNull(),
  lastSeq: integer("last_seq").default(0).notNull(),
}, (t) => [
  primaryKey({ columns: [t.orgId, t.entityType, t.year] }),
]);

// ── Lessons Learned ───────────────────────────────────────────────────────────

export const lessonsLearned = pgTable("nc_lessons_learned", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  llNumber: text("ll_number").notNull(),

  title: text("title").notNull(),

  // 소스 연결 (옵션)
  sourceInternalNcId: text("source_internal_nc_id").references(() => internalNCs.id, { onDelete: "set null" }),
  sourceComplaintId: text("source_complaint_id").references(() => customerComplaints.id, { onDelete: "set null" }),

  // 본문 섹션
  problemSummary: text("problem_summary"),       // 문제 요약
  rootCause: text("root_cause"),                 // 근본 원인
  actionsTaken: text("actions_taken"),           // 취해진 조치
  keyLearning: text("key_learning"),             // 핵심 레슨 (필수 작성 권장)
  preventionMeasures: text("prevention_measures"), // 예방 조치
  applicableAreas: text("applicable_areas"),     // 적용 공정/부서

  // 분류
  tags: text("tags").array(),

  // 상태
  status: text("status", { enum: ["draft", "review", "published"] }).default("draft").notNull(),

  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const internalNCsRelations = relations(internalNCs, ({ one }) => ({
  part: one(ncParts, { fields: [internalNCs.partId], references: [ncParts.id] }),
}));

export const customerComplaintsRelations = relations(customerComplaints, ({ one }) => ({
  customer: one(ncCustomers, { fields: [customerComplaints.customerId], references: [ncCustomers.id] }),
  part: one(ncParts, { fields: [customerComplaints.partId], references: [ncParts.id] }),
}));

export const capaRelations = relations(capas, ({ many }) => ({
  actions: many(capaActions),
  horizontalDeployments: many(horizontalDeployments),
}));

export const lessonsLearnedRelations = relations(lessonsLearned, ({ one }) => ({
  sourceInternalNc: one(internalNCs, { fields: [lessonsLearned.sourceInternalNcId], references: [internalNCs.id] }),
  sourceComplaint: one(customerComplaints, { fields: [lessonsLearned.sourceComplaintId], references: [customerComplaints.id] }),
}));
