import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  customerComplaints, capas, capaActions,
  ncSlaReminderLogs,
} from "@/lib/db/schema";
import { sendEffectivenessReminderEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { eq, and, isNotNull, notInArray, lte, gte } from "drizzle-orm";
import { sendSlaReminderEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_BASE_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
  : "https://nc-manager.vercel.app";

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

  const supabase = createSupabaseAdminClient();
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
    })
    .from(customerComplaints)
    .where(
      notInArray(customerComplaints.status, ["closed", "closed_ntf"])
    );

  for (const c of pendingComplaints) {
    // Look up user info from Supabase
    const { data: userData } = await supabase.auth.admin.getUserById(c.receivedByUserId);
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name ?? "담당자";

    if (!userEmail) continue;

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
            eq(ncSlaReminderLogs.sentToEmail, userEmail),
            gte(ncSlaReminderLogs.sentAt, todayStart)
          )
        )
        .then((r) => r.length > 0);

      if (!alreadySent) {
        try {
          await sendSlaReminderEmail({
            to: userEmail,
            recipientName: userName,
            orgName: "",
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
            sentToEmail: userEmail,
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
            eq(ncSlaReminderLogs.sentToEmail, userEmail),
            gte(ncSlaReminderLogs.sentAt, todayStart)
          )
        )
        .then((r) => r.length > 0);

      if (!alreadySent) {
        try {
          await sendSlaReminderEmail({
            to: userEmail,
            recipientName: userName,
            orgName: "",
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
            sentToEmail: userEmail,
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
      responsibleUserId: capaActions.responsibleUserId,
    })
    .from(capaActions)
    .innerJoin(capas, eq(capaActions.capaId, capas.id))
    .where(
      and(
        isNotNull(capaActions.dueAt),
        isNotNull(capaActions.responsibleUserId),
        notInArray(capaActions.status, ["completed", "cancelled"]),
        lte(capaActions.dueAt, windowEnd)
      )
    );

  for (const a of pendingActions) {
    if (!a.dueAt || !a.capaOrgId || !a.responsibleUserId) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(a.responsibleUserId);
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name ?? "담당자";

    if (!userEmail) continue;

    const alreadySent = await db
      .select({ id: ncSlaReminderLogs.id })
      .from(ncSlaReminderLogs)
      .where(
        and(
          eq(ncSlaReminderLogs.entityType, "capa_action"),
          eq(ncSlaReminderLogs.entityId, a.id),
          eq(ncSlaReminderLogs.sentToEmail, userEmail),
          gte(ncSlaReminderLogs.sentAt, todayStart)
        )
      )
      .then((r) => r.length > 0);

    if (!alreadySent) {
      try {
        await sendSlaReminderEmail({
          to: userEmail,
          recipientName: userName,
          orgName: "",
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
          sentToEmail: userEmail,
        });
        sent++;
      } catch {
        skipped++;
      }
    }
  }

  // ── 3. CAPA 유효성 평가 검토일 임박 ─────────────────────────────────────────

  const pendingEffectiveness = await db
    .select({
      id: capas.id,
      capaNumber: capas.capaNumber,
      title: capas.title,
      orgId: capas.orgId,
      effectivenessReviewDueAt: capas.effectivenessReviewDueAt,
      effectivenessReviewerUserId: capas.effectivenessReviewerUserId,
      status: capas.status,
    })
    .from(capas)
    .where(
      and(
        isNotNull(capas.effectivenessReviewDueAt),
        isNotNull(capas.effectivenessReviewerUserId),
        notInArray(capas.status, ["closed"]),
        lte(capas.effectivenessReviewDueAt, windowEnd)
      )
    );

  for (const c of pendingEffectiveness) {
    if (!c.effectivenessReviewDueAt || !c.effectivenessReviewerUserId) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(c.effectivenessReviewerUserId);
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name ?? "담당자";

    if (!userEmail) continue;

    const alreadySent = await db
      .select({ id: ncSlaReminderLogs.id })
      .from(ncSlaReminderLogs)
      .where(
        and(
          eq(ncSlaReminderLogs.entityType, "capa_effectiveness"),
          eq(ncSlaReminderLogs.entityId, c.id),
          eq(ncSlaReminderLogs.sentToEmail, userEmail),
          gte(ncSlaReminderLogs.sentAt, todayStart)
        )
      )
      .then((r) => r.length > 0);

    if (!alreadySent) {
      try {
        await sendEffectivenessReminderEmail({
          to: userEmail,
          recipientName: userName,
          orgName: "",
          capaNumber: c.capaNumber,
          title: c.title,
          reviewDueAt: c.effectivenessReviewDueAt,
          capaUrl: `${APP_URL}/capa/${c.id}`,
        });
        await db.insert(ncSlaReminderLogs).values({
          orgId: c.orgId,
          entityType: "capa_effectiveness",
          entityId: c.id,
          sentToEmail: userEmail,
        });
        sent++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
