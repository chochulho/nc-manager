import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customerComplaints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { findBlockingLinks, isRecordAdmin, logAdminAction } from "@/lib/nc/admin-registry";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [complaint] = await db
    .select()
    .from(customerComplaints)
    .where(and(eq(customerComplaints.id, id), eq(customerComplaints.orgId, session.user.organizationId)));

  if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(complaint);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "title", "customerDescription", "status", "severity",
    "siteId",
    "customerId", "customerSiteName", "customerReference",
    "receivedAt", "occurredAt", "receivedChannel", "isFormal",
    "discoveryStage", "recurrenceType", "partId", "partNumberDetail", "lotNumber", "quantityClaimed", "quantityConfirmed",
    "categoryL2Id", "safetyRelated", "recallRisk", "resolutionType",
    "initialResponseSentAt", "containedAt", "finalReportSentAt",
    "costRecallReturn", "costPenalty", "costOther",
  ];

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowedFields) {
    if (key in body) patch[key] = body[key] === "" ? null : body[key];
  }
  for (const dateKey of ["receivedAt", "occurredAt", "initialResponseSentAt", "containedAt", "finalReportSentAt"]) {
    if (patch[dateKey]) patch[dateKey] = new Date(patch[dateKey] as string);
  }

  const [updated] = await db
    .update(customerComplaints)
    .set(patch)
    .where(and(eq(customerComplaints.id, id), eq(customerComplaints.orgId, session.user.organizationId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecordAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [existing] = await db
    .select({ id: customerComplaints.id, complaintNumber: customerComplaints.complaintNumber, title: customerComplaints.title })
    .from(customerComplaints)
    .where(and(eq(customerComplaints.id, id), eq(customerComplaints.orgId, session.user.organizationId)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blockers = await findBlockingLinks("customer_complaint", id, session.user.organizationId);
  if (blockers.length > 0) return NextResponse.json({ error: "Linked", blockers }, { status: 409 });

  await db.delete(customerComplaints).where(and(eq(customerComplaints.id, id), eq(customerComplaints.orgId, session.user.organizationId)));
  await logAdminAction(session.user.organizationId, "customer_complaint", id, session.user.id, "deleted", { number: existing.complaintNumber, title: existing.title });

  return NextResponse.json({ ok: true });
}
