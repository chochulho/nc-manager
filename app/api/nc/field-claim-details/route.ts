import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncFieldClaimDetails, customerComplaints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const complaintId = new URL(req.url).searchParams.get("complaintId");
  if (!complaintId) return NextResponse.json({ error: "complaintId required" }, { status: 400 });

  const [detail] = await db
    .select()
    .from(ncFieldClaimDetails)
    .where(
      and(
        eq(ncFieldClaimDetails.orgId, session.user.organizationId),
        eq(ncFieldClaimDetails.complaintId, complaintId),
      )
    );

  return NextResponse.json(detail ?? null);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { complaintId: string };

  const [complaint] = await db
    .select({ id: customerComplaints.id })
    .from(customerComplaints)
    .where(
      and(
        eq(customerComplaints.id, body.complaintId),
        eq(customerComplaints.orgId, session.user.organizationId),
      )
    );
  if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db
    .select({ id: ncFieldClaimDetails.id })
    .from(ncFieldClaimDetails)
    .where(eq(ncFieldClaimDetails.complaintId, body.complaintId))
    .then((r) => r[0] ?? null);
  if (existing) return NextResponse.json({ error: "Already exists" }, { status: 409 });

  const [inserted] = await db
    .insert(ncFieldClaimDetails)
    .values({ orgId: session.user.organizationId, complaintId: body.complaintId })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
