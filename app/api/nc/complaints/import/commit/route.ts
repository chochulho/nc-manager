import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customerComplaints, ncFieldClaimDetails } from "@/lib/db/schema";
import { loadComplaintImportContext, parseComplaintImportWorkbook } from "@/lib/nc/complaint-import";
import { nextComplaintNumber } from "@/lib/nc/sequence";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const siteId = (formData.get("siteId") as string | null) || null;
  if (!file) return NextResponse.json({ error: "파일을 선택하세요." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const orgId = session.user.organizationId;
  const ctx = await loadComplaintImportContext(orgId);

  let rows;
  try {
    rows = parseComplaintImportWorkbook(buffer, ctx);
  } catch {
    return NextResponse.json({ error: "엑셀 파일을 읽을 수 없습니다. 양식을 확인해 주세요." }, { status: 400 });
  }

  const created: { rowNumber: number; complaintNumber: string }[] = [];
  const failed: { rowNumber: number; errors: string[] }[] = [];

  for (const row of rows) {
    if (!row.ok || !row.data) {
      failed.push({ rowNumber: row.rowNumber, errors: row.errors });
      continue;
    }
    const d = row.data;
    const sla = ctx.customerSlaById.get(d.customerId) ?? {
      initialResponseSlaHours: 24, containmentSlaHours: 48, finalReportSlaDays: 15,
    };

    const initialResponseDueAt = new Date(d.receivedAt.getTime() + sla.initialResponseSlaHours * 60 * 60 * 1000);
    const containmentDueAt = new Date(d.receivedAt.getTime() + sla.containmentSlaHours * 60 * 60 * 1000);
    const finalReportDueAt = new Date(d.receivedAt.getTime() + sla.finalReportSlaDays * 24 * 60 * 60 * 1000);

    try {
      const complaintNumber = await nextComplaintNumber(orgId);

      const [inserted] = await db.insert(customerComplaints).values({
        orgId,
        complaintNumber,
        siteId,
        customerId: d.customerId,
        customerSiteName: d.customerSiteName,
        customerReference: d.customerReference,
        receivedAt: d.receivedAt,
        occurredAt: d.occurredAt,
        receivedChannel: d.receivedChannel,
        isFormal: d.isFormal,
        receivedByUserId: session.user.id,
        receivedByName: session.user.name ?? null,
        discoveryStage: d.discoveryStage,
        recurrenceType: d.recurrenceType,
        partId: d.partId,
        partNumberDetail: d.partNumberDetail,
        lotNumber: d.lotNumber,
        quantityClaimed: d.quantityClaimed,
        title: d.title,
        customerDescription: d.customerDescription,
        severity: d.severity,
        safetyRelated: d.safetyRelated,
        recallRisk: d.recallRisk,
        initialResponseDueAt,
        containmentDueAt,
        finalReportDueAt,
      }).returning();

      if (d.fieldClaim) {
        await db.insert(ncFieldClaimDetails).values({
          orgId,
          complaintId: inserted.id,
          vehicleModel: d.fieldClaim.vehicleModel,
          vehicleVin: d.fieldClaim.vehicleVin,
          manufacturedAt: d.fieldClaim.manufacturedAt,
          region: d.fieldClaim.region,
          dealerName: d.fieldClaim.dealerName,
          mileageKm: d.fieldClaim.mileageKm,
          usageMonths: d.fieldClaim.usageMonths,
          dtcCodes: d.fieldClaim.dtcCodes,
          symptomDescription: d.fieldClaim.symptomDescription,
          extraData: d.fieldClaim.extraData,
        });
      }

      created.push({ rowNumber: row.rowNumber, complaintNumber });
    } catch (e) {
      failed.push({ rowNumber: row.rowNumber, errors: [e instanceof Error ? e.message : "등록 중 오류가 발생했습니다."] });
    }
  }

  return NextResponse.json({ createdCount: created.length, failedCount: failed.length, created, failed });
}
