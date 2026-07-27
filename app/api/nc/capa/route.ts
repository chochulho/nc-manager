import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas, ncSequences, internalNCs, partNCs, customerComplaints } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { sendCapaAssignmentEmail } from "@/lib/email";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";

const APP_URL = process.env.NEXT_PUBLIC_BASE_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
  : "https://nc-manager.vercel.app";

async function nextCapaNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .insert(ncSequences)
    .values({ orgId, entityType: "capa", year, lastSeq: 1 })
    .onConflictDoUpdate({
      target: [ncSequences.orgId, ncSequences.entityType, ncSequences.year],
      set: { lastSeq: sql`${ncSequences.lastSeq} + 1` },
    })
    .returning({ lastSeq: ncSequences.lastSeq });

  const seq = result[0].lastSeq;
  return `CAPA-${year}-${String(seq).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const { year, period } = parsePeriodParams(searchParams.get("year") ?? undefined, searchParams.get("period") ?? undefined);
  const range = periodToDateRange(year, period);

  const selectedSiteId = await getSelectedSiteId();
  const siteFilter = buildSiteFilter(session.user.allowedSiteIds, capas.siteId, selectedSiteId);

  const conditions = [eq(capas.orgId, session.user.organizationId)];
  if (siteFilter) conditions.push(siteFilter);
  if (range) {
    conditions.push(gte(capas.createdAt, range.gte));
    conditions.push(lte(capas.createdAt, range.lte));
  }

  const items = await db
    .select()
    .from(capas)
    .where(and(...conditions))
    .orderBy(desc(capas.createdAt))
    .limit(500);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sourceType, sourceId, title, methodology, problemStatement } = body;

  if (!sourceType || !sourceId || !title) {
    return NextResponse.json({ error: "sourceType, sourceId, title은 필수입니다." }, { status: 400 });
  }

  const capaNumber = await nextCapaNumber(session.user.organizationId);

  // 소스 엔티티로부터 siteId 복사 (접근 제어 기준 일관성)
  let sourceSiteId: string | null = null;
  if (sourceType === "internal_nc") {
    const [src] = await db.select({ siteId: internalNCs.occurrenceSiteId }).from(internalNCs)
      .where(and(eq(internalNCs.id, sourceId), eq(internalNCs.orgId, session.user.organizationId))).limit(1);
    sourceSiteId = src?.siteId ?? null;
  } else if (sourceType === "part_nc") {
    const [src] = await db.select({ siteId: partNCs.occurrenceSiteId }).from(partNCs)
      .where(and(eq(partNCs.id, sourceId), eq(partNCs.orgId, session.user.organizationId))).limit(1);
    sourceSiteId = src?.siteId ?? null;
  } else if (sourceType === "customer_complaint") {
    const [src] = await db.select({ siteId: customerComplaints.siteId }).from(customerComplaints)
      .where(and(eq(customerComplaints.id, sourceId), eq(customerComplaints.orgId, session.user.organizationId))).limit(1);
    sourceSiteId = src?.siteId ?? null;
  }

  const [capa] = await db
    .insert(capas)
    .values({
      orgId: session.user.organizationId,
      capaNumber,
      siteId: sourceSiteId,
      sourceType,
      sourceId,
      title,
      methodology: methodology ?? "8d",
      problemStatement: problemStatement ?? null,
      createdByUserId: session.user.id,
      createdByName: session.user.name ?? null,
    })
    .returning();

  // 출처 엔티티에 capaId 역참조 업데이트
  if (sourceType === "internal_nc") {
    await db
      .update(internalNCs)
      .set({ capaId: capa.id, status: "capa_in_progress" })
      .where(and(eq(internalNCs.id, sourceId), eq(internalNCs.orgId, session.user.organizationId)));
  } else if (sourceType === "part_nc") {
    await db
      .update(partNCs)
      .set({ capaId: capa.id, status: "capa_in_progress" })
      .where(and(eq(partNCs.id, sourceId), eq(partNCs.orgId, session.user.organizationId)));
  } else if (sourceType === "customer_complaint") {
    await db
      .update(customerComplaints)
      .set({ capaId: capa.id })
      .where(and(eq(customerComplaints.id, sourceId), eq(customerComplaints.orgId, session.user.organizationId)));
  }

  // champion 배정 알림
  if (body.championUserId && body.championUserId !== session.user.id) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: userData } = await supabase.auth.admin.getUserById(body.championUserId);
      const championEmail = userData?.user?.email;
      const championName = userData?.user?.user_metadata?.full_name ?? "담당자";
      if (championEmail) {
        await sendCapaAssignmentEmail({
          to: championEmail,
          recipientName: championName,
          orgName: session.user.organizationName ?? "",
          capaNumber: capa.capaNumber,
          title: capa.title,
          assignerName: session.user.name ?? "관리자",
          capaUrl: `${APP_URL}/capa/${capa.id}`,
        });
      }
    } catch { /* 이메일 실패는 API 응답에 영향 없음 */ }
  }

  return NextResponse.json(capa, { status: 201 });
}
