import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalNCs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [nc] = await db
    .select()
    .from(internalNCs)
    .where(and(eq(internalNCs.id, id), eq(internalNCs.orgId, session.user.organizationId)));

  if (!nc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(nc);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "title", "description", "discoveredAt", "discoveryStage", "severity",
    "discoveredBySiteId", "discoveredByProcessId",
    "occurrenceSiteId", "occurrenceProcessId", "occurrenceSupplierId",
    "partId", "lotNumber", "quantityInspected", "quantityNc",
    "categoryL2Id", "categoryL3Id", "tags",
    "safetyRelated", "regulatoryRelated", "capaRequired",
    "status", "containmentLocation", "containmentQuantity", "containedAt",
    "dispositionType", "dispositionNotes",
    "costScrap", "costRework", "costOther",
  ];

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowedFields) {
    if (key in body) {
      patch[key] = body[key] === "" ? null : body[key];
    }
  }
  if (body.discoveredAt) patch.discoveredAt = new Date(body.discoveredAt);
  if (body.containedAt) patch.containedAt = new Date(body.containedAt);

  const [updated] = await db
    .update(internalNCs)
    .set(patch)
    .where(and(eq(internalNCs.id, id), eq(internalNCs.orgId, session.user.organizationId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
