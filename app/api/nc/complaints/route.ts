import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customerComplaints, ncSequences, ncCustomers, ncFieldClaimDetails } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { buildSiteFilter } from "@/lib/site-filter";

async function nextComplaintNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .insert(ncSequences)
    .values({ orgId, entityType: "customer_complaint", year, lastSeq: 1 })
    .onConflictDoUpdate({
      target: [ncSequences.orgId, ncSequences.entityType, ncSequences.year],
      set: { lastSeq: sql`${ncSequences.lastSeq} + 1` },
    })
    .returning({ lastSeq: ncSequences.lastSeq });

  const seq = result[0].lastSeq;
  return `CC-${year}-${String(seq).padStart(4, "0")}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteFilter = buildSiteFilter(session.user.allowedSiteIds, customerComplaints.siteId);

  const items = await db
    .select()
    .from(customerComplaints)
    .where(and(eq(customerComplaints.orgId, session.user.organizationId), siteFilter))
    .orderBy(customerComplaints.createdAt);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    siteId,
    customerId, customerSiteName, customerReference,
    receivedAt, receivedChannel, isFormal,
    discoveryStage, partId, lotNumber, quantityClaimed,
    categoryL2Id, categoryL3Id,
    title, customerDescription, severity,
    safetyRelated, recallRisk,
    fieldClaim,
  } = body;

  if (!title || !customerId || !receivedAt || !receivedChannel || !discoveryStage || !severity) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }

  // SLA 계산
  const [customer] = await db
    .select()
    .from(ncCustomers)
    .where(eq(ncCustomers.id, customerId))
    .limit(1);

  const received = new Date(receivedAt);
  const initialSla = customer?.initialResponseSlaHours ?? 24;
  const containmentSla = customer?.containmentSlaHours ?? 48;
  const finalSlaDays = customer?.finalReportSlaDays ?? 15;

  const initialResponseDueAt = new Date(received.getTime() + initialSla * 60 * 60 * 1000);
  const containmentDueAt = new Date(received.getTime() + containmentSla * 60 * 60 * 1000);
  const finalReportDueAt = new Date(received.getTime() + finalSlaDays * 24 * 60 * 60 * 1000);

  const complaintNumber = await nextComplaintNumber(session.user.organizationId);

  const [created] = await db
    .insert(customerComplaints)
    .values({
      orgId: session.user.organizationId,
      complaintNumber,
      siteId: siteId || null,
      customerId,
      customerSiteName: customerSiteName || null,
      customerReference: customerReference || null,
      receivedAt: received,
      receivedChannel,
      isFormal: isFormal ?? true,
      receivedByUserId: session.user.id,
      receivedByName: session.user.name ?? null,
      discoveryStage,
      partId: partId || null,
      lotNumber: lotNumber || null,
      quantityClaimed: quantityClaimed || null,
      categoryL2Id: categoryL2Id || null,
      categoryL3Id: categoryL3Id || null,
      title,
      customerDescription: customerDescription || null,
      severity,
      safetyRelated: safetyRelated ?? false,
      recallRisk: recallRisk ?? false,
      initialResponseDueAt,
      containmentDueAt,
      finalReportDueAt,
    })
    .returning();

  // field/warranty + fieldClaim 데이터가 있으면 함께 저장
  if ((discoveryStage === "field" || discoveryStage === "warranty") && fieldClaim) {
    await db.insert(ncFieldClaimDetails).values({
      orgId: session.user.organizationId,
      complaintId: created.id,
      vehicleModel: fieldClaim.vehicleModel || null,
      vehicleVin: fieldClaim.vehicleVin || null,
      manufacturedAt: fieldClaim.manufacturedAt ? new Date(fieldClaim.manufacturedAt) : null,
      region: fieldClaim.region || null,
      dealerName: fieldClaim.dealerName || null,
      mileageKm: fieldClaim.mileageKm || null,
      usageMonths: fieldClaim.usageMonths ?? null,
      dtcCodes: fieldClaim.dtcCodes?.length ? fieldClaim.dtcCodes : null,
      symptomDescription: fieldClaim.symptomDescription || null,
      extraData: fieldClaim.extraData ?? null,
    });
  }

  return NextResponse.json(created, { status: 201 });
}
