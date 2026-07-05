import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customerComplaints, ncCustomers, ncParts, ncAnalysisReports } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { ComplaintList } from "./complaint-list";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const sp = await searchParams;
  const { year, period } = parsePeriodParams(sp.year, sp.period);
  const range = periodToDateRange(year, period);

  const selectedSiteId = await getSelectedSiteId();
  const siteFilter = buildSiteFilter(session.user.allowedSiteIds, customerComplaints.siteId, selectedSiteId);

  const conditions = [eq(customerComplaints.orgId, session.user.organizationId)];
  if (siteFilter) conditions.push(siteFilter);
  if (range) {
    conditions.push(gte(customerComplaints.receivedAt, range.gte));
    conditions.push(lte(customerComplaints.receivedAt, range.lte));
  }

  const complaints = await db
    .select({
      id: customerComplaints.id,
      complaintNumber: customerComplaints.complaintNumber,
      title: customerComplaints.title,
      receivedAt: customerComplaints.receivedAt,
      discoveryStage: customerComplaints.discoveryStage,
      severity: customerComplaints.severity,
      status: customerComplaints.status,
      safetyRelated: customerComplaints.safetyRelated,
      recallRisk: customerComplaints.recallRisk,
      initialResponseDueAt: customerComplaints.initialResponseDueAt,
      finalReportDueAt: customerComplaints.finalReportDueAt,
      receivedChannel: customerComplaints.receivedChannel,
      capaId: customerComplaints.capaId,
      resolutionType: customerComplaints.resolutionType,
      customerName: ncCustomers.name,
      partName: ncParts.partName,
      partNumber: ncParts.partNumber,
      analysisStatus: ncAnalysisReports.status,
      analysisSections: ncAnalysisReports.sections,
    })
    .from(customerComplaints)
    .leftJoin(ncCustomers, eq(customerComplaints.customerId, ncCustomers.id))
    .leftJoin(ncParts, eq(customerComplaints.partId, ncParts.id))
    .leftJoin(ncAnalysisReports, eq(ncAnalysisReports.complaintId, customerComplaints.id))
    .where(and(...conditions))
    .orderBy(desc(customerComplaints.createdAt))
    .limit(500);

  return <ComplaintList items={complaints} year={year} period={period} />;
}
