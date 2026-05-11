import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalNCs, ncSequences } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function nextNcNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .insert(ncSequences)
    .values({ orgId, entityType: "internal_nc", year, lastSeq: 1 })
    .onConflictDoUpdate({
      target: [ncSequences.orgId, ncSequences.entityType, ncSequences.year],
      set: { lastSeq: sql`${ncSequences.lastSeq} + 1` },
    })
    .returning({ lastSeq: ncSequences.lastSeq });

  const seq = result[0].lastSeq;
  return `NC-${year}-${String(seq).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(internalNCs)
    .where(eq(internalNCs.orgId, session.user.organizationId))
    .orderBy(internalNCs.createdAt);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title, description, discoveredAt, discoveryStage, severity,
    discoveredBySiteId, discoveredByProcessId,
    occurrenceSiteId, occurrenceProcessId, occurrenceSupplierId,
    partId, lotNumber, quantityInspected, quantityNc,
    categoryL2Id, categoryL3Id, tags,
    safetyRelated, regulatoryRelated, capaRequired,
  } = body;

  if (!title || !discoveredAt || !discoveryStage || !severity) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }

  const ncNumber = await nextNcNumber(session.user.organizationId);

  const [created] = await db
    .insert(internalNCs)
    .values({
      orgId: session.user.organizationId,
      ncNumber,
      title,
      description,
      discoveredAt: new Date(discoveredAt),
      discoveryStage,
      severity,
      discoveredBySiteId: discoveredBySiteId || null,
      discoveredByProcessId: discoveredByProcessId || null,
      discoveredByUserId: session.user.id,
      occurrenceSiteId: occurrenceSiteId || null,
      occurrenceProcessId: occurrenceProcessId || null,
      occurrenceSupplierId: occurrenceSupplierId || null,
      partId: partId || null,
      lotNumber: lotNumber || null,
      quantityInspected: quantityInspected || null,
      quantityNc: quantityNc || null,
      categoryL2Id: categoryL2Id || null,
      categoryL3Id: categoryL3Id || null,
      tags: tags ?? [],
      safetyRelated: safetyRelated ?? false,
      regulatoryRelated: regulatoryRelated ?? false,
      capaRequired: capaRequired ?? false,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
