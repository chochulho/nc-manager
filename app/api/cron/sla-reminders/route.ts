import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  customerComplaints, capas, capaActions,
  ncSlaReminderLogs, organizations,
} from "@/lib/db/schema";
import { users } from "@/lib/db/schema";
import { eq, and, isNotNull, isNull, notInArray, lte, gte } from "drizzle-orm";
import { sendSlaReminderEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://nc-manager.vercel.app";

// Vercel Cron calls this with Authorization: Bearer <CRON_SECRET>
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback — no secret configured
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // 알림 대상: 오늘부터 48시간 이내 마감 (이미 지난 것 포함)
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  // 중복 방지: 오늘 이미 보낸 것은 제외 (당일 00:00 기준)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let sent = 0;
  let skipped = 0;

  // ── 1. SLA 마감 임박 클레임 ──────────────────────────────────────────────────

  const pendingComplaints = await db
    .select({
      id: customerComplaints.id,
      complaintNumber: customerComplaints.complaintNumber,
      title: customerComplaints.title,
      orgId: customerComplaints.orgId,
      initialResponseDueAt: customerComplaints.initialResponseDueAt,
      initialResponseSentAt: customerComplaints.initialResponseSentAt,
      finalReportDueAt: customerComplaints.finalReportDueAt,
      finalReportSentAt: customerComplaints.finalReportSentAt,
      status: customerComplaints.status,
      receivedByUserId: customerComplaints.receivedByUserId,
      orgName: organizations.name,
      userName: users.name,
      userEmail: users.email,
    })
    .from(customerComplaints)
    .leftJoin(organizations, eq(customerComplaints.orgId, organizations.id))
    .leftJoin(users, eq(customerComplaints.receivedByUserId, users.id))
    .where(
      notInArray(customerComplaints.status, ["closed", "closed_ntf"])
    );

  for (const c of pendingComplaints) {
    if (!c.userEmail) continue;

    // Initial response SLA
    if (
      c.initialResponseDueAt &&
      c.initialResponseSentAt === null &&
      c.initialResponseDueAt <= windowEnd
    ) {
      const alreadySent = await db
        .select({ id: ncSlaReminderLogs.id })
        .from(ncSlaReminderLogs)
        .where(
          and(
            eq(ncSlaReminderLogs.entityType, "complaint_initial"),
            eq(ncSlaReminderLogs.entityId, c.id),
            eq(ncSlaReminderLogs.sentToEmail, c.userEmail),
            gte(ncSlaReminderLogs.sentAt, todayStart)
          )
        )
        .then((r) => r.length > 0);

      if (!alreadySent) {
        try {
          await sendSlaReminderEmail({
            to: c.userEmail,
            recipientName: c.userName ?? "담당자",
            orgName: c.orgName ?? "",
            complaintNumber: c.complaintNumber,
            title: c.title,
            slaType: "initial_response",
            dueAt: c.initialResponseDueAt,
            complaintUrl: `${APP_URL}/complaints/${c.id}`,
          });
          await db.insert(ncSlaReminderLogs).values({
            orgId: c.orgId,
            entityType: "complaint_initial",
            entityId: c.id,
            sentToEmail: c.userEmail,
          });
          sent++;
        } catch {
          skipped++;
        }
      }
    }

    // Final report SLA
    if (
      c.finalReportDueAt &&
      c.finalReportSentAt === null &&
      c.finalReportDueAt <= windowEnd
    ) {
      const alreadySent = await db
        .select({ id: ncSlaReminderLogs.id })
        .from(ncSlaReminderLogs)
        .where(
          and(
            eq(ncSlaReminderLogs.entityType, "complaint_final"),
            eq(ncSlaReminderLogs.entityId, c.id),
            eq(ncSlaReminderLogs.sentToEmail, c.userEmail),
            gte(ncSlaReminderLogs.sentAt, todayStart)
          )
        )
        .then((r) => r.length > 0);

      if (!alreadySent) {
        try {
          await sendSlaReminderEmail({
            to: c.userEmail,
            recipientName: c.userName ?? "담당자",
            orgName: c.orgName ?? "",
            complaintNumber: c.complaintNumber,
            title: c.title,
            slaType: "final_report",
            dueAt: c.finalReportDueAt,
            complaintUrl: `${APP_URL}/complaints/${c.id}`,
          });
          await db.insert(ncSlaReminderLogs).values({
            orgId: c.orgId,
            entityType: "complaint_final",
            entityId: c.id,
            sentToEmail: c.userEmail,
          });
          sent++;
        } catch {
          skipped++;
        }
      }
    }
  }

  // ── 2. CAPA 조치항목 마감 임박 ───────────────────────────────────────────────

  const pendingActions = await db
    .select({
      id: capaActions.id,
      capaId: capaActions.capaId,
      description: capaActions.description,
      dueAt: capaActions.dueAt,
      capaNumber: capas.capaNumber,
      capaTitle: capas.title,
      capaOrgId: capas.orgId,
      orgName: organizations.name,
      userName: users.name,
      userEmail: users.email,
    })
    .from(capaActions)
    .innerJoin(capas, eq(capaActions.capaId, capas.id))
    .leftJoin(organizations, eq(capas.orgId, organizations.id))
    .leftJoin(users, eq(capaActions.responsibleUserId, users.id))
    .where(
      and(
        isNotNull(capaActions.dueAt),
        isNotNull(capaActions.responsibleUserId),
        notInArray(capaActions.status, ["completed", "cancelled"]),
        lte(capaActions.dueAt, windowEnd)
      )
    );

  for (const a of pendingActions) {
    if (!a.userEmail || !a.dueAt || !a.capaOrgId) continue;

    const alreadySent = await db
      .select({ id: ncSlaReminderLogs.id })
      .from(ncSlaReminderLogs)
      .where(
        and(
          eq(ncSlaReminderLogs.entityType, "capa_action"),
          eq(ncSlaReminderLogs.entityId, a.id),
          eq(ncSlaReminderLogs.sentToEmail, a.userEmail),
          gte(ncSlaReminderLogs.sentAt, todayStart)
        )
      )
      .then((r) => r.length > 0);

    if (!alreadySent) {
      try {
        // Reuse SLA reminder email template for action due date
        await sendSlaReminderEmail({
          to: a.userEmail,
          recipientName: a.userName ?? "담당자",
          orgName: a.orgName ?? "",
          complaintNumber: a.capaNumber,
          title: `[조치항목] ${a.description}`,
          slaType: "final_report",
          dueAt: a.dueAt,
          complaintUrl: `${APP_URL}/capa/${a.capaId}`,
        });
        await db.insert(ncSlaReminderLogs).values({
          orgId: a.capaOrgId,
          entityType: "capa_action",
          entityId: a.id,
          sentToEmail: a.userEmail,
        });
        sent++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
