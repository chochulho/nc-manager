import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncFieldClaimDetails } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Partial<{
    vehicleModel: string;
    vehicleVin: string;
    manufacturedAt: string | null;
    region: string;
    dealerName: string;
    mileageKm: string;
    usageMonths: number | null;
    dtcCodes: string[];
    symptomDescription: string;
    extraData: Record<string, unknown>;
  }>;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  const strFields = ["vehicleModel", "vehicleVin", "region", "dealerName", "mileageKm", "symptomDescription"] as const;
  for (const f of strFields) {
    if (f in body) update[f] = body[f] === "" ? null : body[f];
  }
  if ("manufacturedAt" in body) {
    update.manufacturedAt = body.manufacturedAt ? new Date(body.manufacturedAt) : null;
  }
  if ("usageMonths" in body) update.usageMonths = body.usageMonths ?? null;
  if ("dtcCodes" in body) update.dtcCodes = body.dtcCodes;
  if ("extraData" in body) update.extraData = body.extraData;

  const [updated] = await db
    .update(ncFieldClaimDetails)
    .set(update)
    .where(
      and(
        eq(ncFieldClaimDetails.id, id),
        eq(ncFieldClaimDetails.orgId, session.user.organizationId),
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(ncFieldClaimDetails)
    .where(
      and(
        eq(ncFieldClaimDetails.id, id),
        eq(ncFieldClaimDetails.orgId, session.user.organizationId),
      )
    );

  return new NextResponse(null, { status: 204 });
}
