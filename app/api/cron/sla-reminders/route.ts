import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  customerComplaints, capas, capaActions,
  ncSlaReminderLogs,
} from "@/lib/db/schema";
import { sendEffectivenessReminderEmail, sendCapaEscalationEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { eq, and, isNotNull, notInArray, gte } from "drizzle-orm";
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

// 마감일까지 남은 일수(달력 기준, 시각 무시). 0=오늘 마감, 음수=지남.
function daysUntilDue(dueAt: Date, now: Date): number {
  const due = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let sent = 0;
  let skipped = 0;

  // 조직의 관리자(owner/admin) 이메일 목록 캐시 (orgId → [{email, name}])
  const orgAdminsCache = new Map<string, { email: string; name: string }[]>();
  async function getOrgAdmins(orgId: string): Promise<{ email: string; name: string }[]> {
    if (orgAdminsCache.has(orgId)) return orgAdminsCache.get(orgId)!;
    const { data: adminRows } = await supabase
      .from("org_members")
      .select("user_id, role")
      .eq("org_id", orgId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]);

    const admins = await Promise.all(
      (adminRows ?? []).map(async (m) => {
        const { data: ud } = await supabase.auth.admin.getUserById(m.user_id as string);
        return {
          email: ud?.user?.email ?? "",
          name: ud?.user?.user_metadata?.full_name ?? "관리자",
        };
      })
    );
    const filtered = admins.filter((a) => a.email);
    orgAdminsCache.set(orgId, filtered);
    return filtered;
  }

  // 이미 발송된 로그인지 확인 (entityType+entityId+수신자 기준, 재발송 방지 — 날짜 무관하게 1회만)
  async function wasSent(entityType: (typeof ncSlaReminderLogs.$inferInsert)["entityType"], entityId: string, toEmail: string): Promise<boolean> {
    const rows = await db
      .select({ id: ncSlaReminderLogs.id })
      .from(ncSlaReminderLogs)
      .where(
        and(
          eq(ncSlaReminderLogs.entityType, entityType),
          eq(ncSlaReminderLogs.entityId, entityId),
          eq(ncSlaReminderLogs.sentToEmail, toEmail)
        )
      );
    return rows.length > 0;
  }

  async function logSent(orgId: string, entityType: (typeof ncSlaReminderLogs.$inferInsert)["entityType"], entityId: string, toEmail: string) {
    await db.insert(ncSlaReminderLogs).values({ orgId, entityType, entityId, sentToEmail: toEmail });
  }

  // ── 1. SLA 마감 임박 클레임 (기존 로직 유지: 마감 48시간 이내 매일 리마인드) ──────

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
    const { data: userData } = await supabase.auth.admin.getUserById(c.receivedByUserId);
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name ?? "담당자";

    if (!userEmail) continue;

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
          await logSent(c.orgId, "complaint_initial", c.id, userEmail);
          sent++;
        } catch {
          skipped++;
        }
      }
    }

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
          await logSent(c.orgId, "complaint_final", c.id, userEmail);
          sent++;
        } catch {
          skipped++;
        }
      }
    }
  }

  // ── 2. CAPA 조치항목 — 배정 시 즉시 메일(생성 API에서 처리됨) 이후,
  //      마감 D-5 / D-1 고정 시점 리마인드 + 마감 초과 시 관리자 에스컬레이션 ──

  const openActions = await db
    .select({
      id: capaActions.id,
      capaId: capaActions.capaId,
      description: capaActions.description,
      dueAt: capaActions.dueAt,
      status: capaActions.status,
      responsibleUserId: capaActions.responsibleUserId,
      responsibleName: capaActions.responsibleName,
      capaNumber: capas.capaNumber,
      capaTitle: capas.title,
      capaOrgId: capas.orgId,
    })
    .from(capaActions)
    .innerJoin(capas, eq(capaActions.capaId, capas.id))
    .where(
      and(
        isNotNull(capaActions.dueAt),
        isNotNull(capaActions.responsibleUserId),
        notInArray(capaActions.status, ["completed", "cancelled"])
      )
    );

  for (const a of openActions) {
    if (!a.dueAt || !a.responsibleUserId) continue;
    const diff = daysUntilDue(a.dueAt, now);

    const { data: userData } = await supabase.auth.admin.getUserById(a.responsibleUserId);
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name ?? a.responsibleName ?? "담당자";

    if (diff === 5 || diff === 1) {
      if (!userEmail) continue;
      const entityType = diff === 5 ? "capa_action_d5" as const : "capa_action_d1" as const;
      if (await wasSent(entityType, a.id, userEmail)) continue;
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
        await logSent(a.capaOrgId, entityType, a.id, userEmail);
        sent++;
      } catch {
        skipped++;
      }
    } else if (diff < 0) {
      // 기한 초과 → 조직 관리자에게 1회 에스컬레이션
      const admins = await getOrgAdmins(a.capaOrgId);
      for (const admin of admins) {
        if (await wasSent("capa_action_escalation", a.id, admin.email)) continue;
        try {
          await sendCapaEscalationEmail({
            to: admin.email,
            recipientName: admin.name,
            orgName: "",
            capaNumber: a.capaNumber,
            capaTitle: a.capaTitle,
            itemLabel: `조치항목: ${a.description}`,
            responsibleName: userName,
            dueAt: a.dueAt,
            daysOverdue: Math.abs(diff),
            capaUrl: `${APP_URL}/capa/${a.capaId}`,
          });
          await logSent(a.capaOrgId, "capa_action_escalation", a.id, admin.email);
          sent++;
        } catch {
          skipped++;
        }
      }
    }
  }

  // ── 3. CAPA 유효성 평가 — 검토 예정일 D-5 / D-1 리마인드 + 초과 시 에스컬레이션 ──

  const openEffectiveness = await db
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
        notInArray(capas.status, ["closed"])
      )
    );

  for (const c of openEffectiveness) {
    if (!c.effectivenessReviewDueAt || !c.effectivenessReviewerUserId) continue;
    const diff = daysUntilDue(c.effectivenessReviewDueAt, now);

    const { data: userData } = await supabase.auth.admin.getUserById(c.effectivenessReviewerUserId);
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name ?? "담당자";

    if (diff === 5 || diff === 1) {
      if (!userEmail) continue;
      const entityType = diff === 5 ? "capa_effectiveness_d5" as const : "capa_effectiveness_d1" as const;
      if (await wasSent(entityType, c.id, userEmail)) continue;
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
        await logSent(c.orgId, entityType, c.id, userEmail);
        sent++;
      } catch {
        skipped++;
      }
    } else if (diff < 0) {
      const admins = await getOrgAdmins(c.orgId);
      for (const admin of admins) {
        if (await wasSent("capa_effectiveness_escalation", c.id, admin.email)) continue;
        try {
          await sendCapaEscalationEmail({
            to: admin.email,
            recipientName: admin.name,
            orgName: "",
            capaNumber: c.capaNumber,
            capaTitle: c.title,
            itemLabel: "유효성 평가",
            responsibleName: userName,
            dueAt: c.effectivenessReviewDueAt,
            daysOverdue: Math.abs(diff),
            capaUrl: `${APP_URL}/capa/${c.id}`,
          });
          await logSent(c.orgId, "capa_effectiveness_escalation", c.id, admin.email);
          sent++;
        } catch {
          skipped++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
