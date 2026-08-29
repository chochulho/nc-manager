import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customerComplaints, ncCustomers, ncParts, ncAnalysisReports, ncFieldClaimDetails, capas } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { ComplaintList } from "./complaint-list";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";
import { PAGE_SIZE, parsePageParam, totalPagesFor } from "@/lib/pagination";

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const sp = await searchParams;
  const { year, period } = parsePeriodParams(sp.year, sp.period);
  const range = periodToDateRange(year, period);
  const page = parsePageParam(sp.page);

  const selectedSiteId = await getSelectedSiteId();
  const siteFilter = buildSiteFilter(session.user.allowedSiteIds, customerComplaints.siteId, selectedSiteId);

  const conditions = [eq(customerComplaints.orgId, session.user.organizationId)];
  if (siteFilter) conditions.push(siteFilter);
  if (range) {
    conditions.push(gte(customerComplaints.receivedAt, range.gte));
    conditions.push(lte(customerComplaints.receivedAt, range.lte));
  }

  const [complaints, [{ total }]] = await Promise.all([
    db
      .select({
        id: customerComplaints.id,
        complaintNumber: customerComplaints.complaintNumber,
        title: customerComplaints.title,
        receivedAt: customerComplaints.receivedAt,
        occurredAt: customerComplaints.occurredAt,
        discoveryStage: customerComplaints.discoveryStage,
        severity: customerComplaints.severity,
        status: customerComplaints.status,
        safetyRelated: customerComplaints.safetyRelated,
        recallRisk: customerComplaints.recallRisk,
        initialResponseDueAt: customerComplaints.initialResponseDueAt,
        finalReportDueAt: customerComplaints.finalReportDueAt,
        capaId: customerComplaints.capaId,
        capaNumber: capas.capaNumber,
        resolutionType: customerComplaints.resolutionType,
        recurrenceType: customerComplaints.recurrenceType,
        lotNumber: customerComplaints.lotNumber,
        partNumberDetail: customerComplaints.partNumberDetail,
        customerName: ncCustomers.name,
        partName: ncParts.partName,
        partNumber: ncParts.partNumber,
        analysisSections: ncAnalysisReports.sections,
        vehicleModel: ncFieldClaimDetails.vehicleModel,
        vehicleVin: ncFieldClaimDetails.vehicleVin,
        mileageKm: ncFieldClaimDetails.mileageKm,
      })
      .from(customerComplaints)
      .leftJoin(ncCustomers, eq(customerComplaints.customerId, ncCustomers.id))
      .leftJoin(ncParts, eq(customerComplaints.partId, ncParts.id))
      .leftJoin(ncAnalysisReports, eq(ncAnalysisReports.complaintId, customerComplaints.id))
      .leftJoin(ncFieldClaimDetails, eq(ncFieldClaimDetails.complaintId, customerComplaints.id))
      .leftJoin(capas, eq(customerComplaints.capaId, capas.id))
      .where(and(...conditions))
      .orderBy(desc(customerComplaints.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(customerComplaints).where(and(...conditions)),
  ]);

  return (
    <ComplaintList
      items={complaints}
      year={year}
      period={period}
      page={page}
      totalPages={totalPagesFor(total)}
      totalCount={total}
    />
  );
}
