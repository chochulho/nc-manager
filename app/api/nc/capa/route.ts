import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas, ncSequences, internalNCs, customerComplaints } from "@/lib/db/schema";
import { users, organizations } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { sendCapaAssignmentEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://nc-manager.vercel.app";

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

  const conditions = [eq(capas.orgId, session.user.organizationId)];
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

  const [capa] = await db
    .insert(capas)
    .values({
      orgId: session.user.organizationId,
      capaNumber,
      sourceType,
      sourceId,
      title,
      methodology: methodology ?? "8d",
      problemStatement: problemStatement ?? null,
    })
    .returning();

  // 출처 엔티티에 capaId 역참조 업데이트
  if (sourceType === "internal_nc") {
    await db
      .update(internalNCs)
      .set({ capaId: capa.id, status: "capa_in_progress" })
      .where(and(eq(internalNCs.id, sourceId), eq(internalNCs.orgId, session.user.organizationId)));
  } else if (sourceType === "customer_complaint") {
    await db
      .update(customerComplaints)
      .set({ capaId: capa.id })
      .where(and(eq(customerComplaints.id, sourceId), eq(customerComplaints.orgId, session.user.organizationId)));
  }

  // champion 배정 알림
  if (body.championUserId && body.championUserId !== session.user.id) {
    try {
      const [champion] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, body.championUserId));
      const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, session.user.organizationId));
      if (champion?.email) {
        await sendCapaAssignmentEmail({
          to: champion.email,
          recipientName: champion.name ?? "담당자",
          orgName: org?.name ?? "",
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
