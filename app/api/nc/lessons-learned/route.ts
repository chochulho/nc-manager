import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonsLearned, ncSequences, internalNCs, customerComplaints } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function nextLlNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .insert(ncSequences)
    .values({ orgId, entityType: "lessons_learned", year, lastSeq: 1 })
    .onConflictDoUpdate({
      target: [ncSequences.orgId, ncSequences.entityType, ncSequences.year],
      set: { lastSeq: sql`${ncSequences.lastSeq} + 1` },
    })
    .returning({ lastSeq: ncSequences.lastSeq });

  const seq = result[0].lastSeq;
  return `LL-${year}-${String(seq).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select({
      id: lessonsLearned.id,
      orgId: lessonsLearned.orgId,
      llNumber: lessonsLearned.llNumber,
      title: lessonsLearned.title,
      sourceInternalNcId: lessonsLearned.sourceInternalNcId,
      sourceComplaintId: lessonsLearned.sourceComplaintId,
      problemSummary: lessonsLearned.problemSummary,
      rootCause: lessonsLearned.rootCause,
      actionsTaken: lessonsLearned.actionsTaken,
      keyLearning: lessonsLearned.keyLearning,
      preventionMeasures: lessonsLearned.preventionMeasures,
      applicableAreas: lessonsLearned.applicableAreas,
      tags: lessonsLearned.tags,
      status: lessonsLearned.status,
      createdByUserId: lessonsLearned.createdByUserId,
      createdAt: lessonsLearned.createdAt,
      updatedAt: lessonsLearned.updatedAt,
      // joined NC info
      ncNumber: internalNCs.ncNumber,
      // joined complaint info
      complaintNumber: customerComplaints.complaintNumber,
    })
    .from(lessonsLearned)
    .leftJoin(internalNCs, eq(lessonsLearned.sourceInternalNcId, internalNCs.id))
    .leftJoin(customerComplaints, eq(lessonsLearned.sourceComplaintId, customerComplaints.id))
    .where(eq(lessonsLearned.orgId, session.user.organizationId))
    .orderBy(desc(lessonsLearned.createdAt));

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    sourceInternalNcId,
    sourceComplaintId,
    problemSummary,
    rootCause,
    actionsTaken,
    keyLearning,
    preventionMeasures,
    applicableAreas,
    tags,
    status,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 });
  }

  const llNumber = await nextLlNumber(session.user.organizationId);

  const [created] = await db
    .insert(lessonsLearned)
    .values({
      orgId: session.user.organizationId,
      llNumber,
      title: title.trim(),
      sourceInternalNcId: sourceInternalNcId || null,
      sourceComplaintId: sourceComplaintId || null,
      problemSummary: problemSummary || null,
      rootCause: rootCause || null,
      actionsTaken: actionsTaken || null,
      keyLearning: keyLearning || null,
      preventionMeasures: preventionMeasures || null,
      applicableAreas: applicableAreas || null,
      tags: tags?.length ? tags : null,
      status: status || "draft",
      createdByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
