import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { qAlerts, ncSequences } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function nextAlertNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .insert(ncSequences)
    .values({ orgId, entityType: "q_alert", year, lastSeq: 1 })
    .onConflictDoUpdate({
      target: [ncSequences.orgId, ncSequences.entityType, ncSequences.year],
      set: { lastSeq: sql`${ncSequences.lastSeq} + 1` },
    })
    .returning({ lastSeq: ncSequences.lastSeq });

  const seq = result[0].lastSeq;
  return `QA-${year}-${String(seq).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  const conditions = [eq(qAlerts.orgId, session.user.organizationId)];
  if (status) conditions.push(eq(qAlerts.status, status as "draft" | "reviewed" | "posted" | "archived"));

  const items = await db
    .select()
    .from(qAlerts)
    .where(and(...conditions))
    .orderBy(desc(qAlerts.createdAt))
    .limit(500);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, problemSummary, rootCause, prevention, targetProcess,
          sourceType, sourceId, sourceNumber } = body;

  if (!title) return NextResponse.json({ error: "title은 필수입니다." }, { status: 400 });

  const alertNumber = await nextAlertNumber(session.user.organizationId);

  const [alert] = await db
    .insert(qAlerts)
    .values({
      orgId: session.user.organizationId,
      alertNumber,
      title,
      problemSummary: problemSummary ?? null,
      rootCause: rootCause ?? null,
      prevention: prevention ?? null,
      targetProcess: targetProcess ?? null,
      sourceType: sourceType ?? null,
      sourceId: sourceId ?? null,
      sourceNumber: sourceNumber ?? null,
      createdByUserId: session.user.id,
      createdByName: session.user.name ?? null,
    })
    .returning();

  return NextResponse.json(alert, { status: 201 });
}
