import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customerComplaints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
    "customerId", "customerSiteName", "customerReference",
    "receivedAt", "receivedChannel", "isFormal",
    "discoveryStage", "partId", "lotNumber", "quantityClaimed", "quantityConfirmed",
    "categoryL2Id", "safetyRelated", "recallRisk", "resolutionType",
    "initialResponseSentAt", "containedAt", "finalReportSentAt",
    "costRecallReturn", "costPenalty", "costOther",
  ];

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowedFields) {
    if (key in body) patch[key] = body[key] === "" ? null : body[key];
  }
  for (const dateKey of ["receivedAt", "initialResponseSentAt", "containedAt", "finalReportSentAt"]) {
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
