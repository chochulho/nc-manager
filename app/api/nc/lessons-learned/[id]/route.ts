import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonsLearned, internalNCs, customerComplaints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isRecordAdmin, logAdminAction } from "@/lib/nc/admin-registry";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [item] = await db
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
      // joined NC
      ncNumber: internalNCs.ncNumber,
      ncTitle: internalNCs.title,
      ncDescription: internalNCs.description,
      ncSeverity: internalNCs.severity,
      // joined complaint
      complaintNumber: customerComplaints.complaintNumber,
      complaintTitle: customerComplaints.title,
      complaintDescription: customerComplaints.customerDescription,
      complaintSeverity: customerComplaints.severity,
    })
    .from(lessonsLearned)
    .leftJoin(internalNCs, eq(lessonsLearned.sourceInternalNcId, internalNCs.id))
    .leftJoin(customerComplaints, eq(lessonsLearned.sourceComplaintId, customerComplaints.id))
    .where(
      and(
        eq(lessonsLearned.id, id),
        eq(lessonsLearned.orgId, session.user.organizationId)
      )
    );

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
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

  const [updated] = await db
    .update(lessonsLearned)
    .set({
      ...(title !== undefined && { title }),
      ...(sourceInternalNcId !== undefined && { sourceInternalNcId: sourceInternalNcId || null }),
      ...(sourceComplaintId !== undefined && { sourceComplaintId: sourceComplaintId || null }),
      ...(problemSummary !== undefined && { problemSummary }),
      ...(rootCause !== undefined && { rootCause }),
      ...(actionsTaken !== undefined && { actionsTaken }),
      ...(keyLearning !== undefined && { keyLearning }),
      ...(preventionMeasures !== undefined && { preventionMeasures }),
      ...(applicableAreas !== undefined && { applicableAreas }),
      ...(tags !== undefined && { tags }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(lessonsLearned.id, id),
        eq(lessonsLearned.orgId, session.user.organizationId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRecordAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [existing] = await db
    .select({ id: lessonsLearned.id, llNumber: lessonsLearned.llNumber, title: lessonsLearned.title })
    .from(lessonsLearned)
    .where(and(eq(lessonsLearned.id, id), eq(lessonsLearned.orgId, session.user.organizationId)));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(lessonsLearned)
    .where(
      and(
        eq(lessonsLearned.id, id),
        eq(lessonsLearned.orgId, session.user.organizationId)
      )
    );

  await logAdminAction(session.user.organizationId, "lessons_learned", id, session.user.id, "deleted", {
    number: existing.llNumber,
    title: existing.title,
  });

  return NextResponse.json({ ok: true });
}
