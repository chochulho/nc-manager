import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncFieldClaimDetails, customerComplaints, ncCustomers, ncParts } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const { year, period } = parsePeriodParams(sp.get("year") ?? undefined, sp.get("period") ?? undefined);
  const range = periodToDateRange(year, period);

  const conditions = [eq(ncFieldClaimDetails.orgId, session.user.organizationId)];
  if (range) {
    conditions.push(gte(customerComplaints.receivedAt, range.gte));
    conditions.push(lte(customerComplaints.receivedAt, range.lte));
  }

  const rows = await db
    .select({
      vehicleModel: ncFieldClaimDetails.vehicleModel,
      region: ncFieldClaimDetails.region,
      dtcCodes: ncFieldClaimDetails.dtcCodes,
      mileageKm: ncFieldClaimDetails.mileageKm,
      usageMonths: ncFieldClaimDetails.usageMonths,
      symptomDescription: ncFieldClaimDetails.symptomDescription,
      receivedAt: customerComplaints.receivedAt,
      complaintId: customerComplaints.id,
      complaintNumber: customerComplaints.complaintNumber,
      title: customerComplaints.title,
      status: customerComplaints.status,
      severity: customerComplaints.severity,
      discoveryStage: customerComplaints.discoveryStage,
      customerName: ncCustomers.name,
      partName: ncParts.partName,
    })
    .from(ncFieldClaimDetails)
    .innerJoin(customerComplaints, eq(ncFieldClaimDetails.complaintId, customerComplaints.id))
    .leftJoin(ncCustomers, eq(customerComplaints.customerId, ncCustomers.id))
    .leftJoin(ncParts, eq(customerComplaints.partId, ncParts.id))
    .where(and(...conditions))
    .orderBy(desc(customerComplaints.receivedAt))
    .limit(2000);

  // ── Aggregations ─────────────────────────────────────────────────────────────

  // Vehicle model counts
  const vehicleModelMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.vehicleModel || "미입력";
    vehicleModelMap.set(key, (vehicleModelMap.get(key) ?? 0) + 1);
  }
  const vehicleModelCounts = [...vehicleModelMap.entries()]
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Region counts
  const regionMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.region || "미입력";
    regionMap.set(key, (regionMap.get(key) ?? 0) + 1);
  }
  const regionCounts = [...regionMap.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // DTC frequency
  const dtcMap = new Map<string, number>();
  for (const r of rows) {
    if (r.dtcCodes && r.dtcCodes.length > 0) {
      for (const code of r.dtcCodes) {
        if (code) dtcMap.set(code, (dtcMap.get(code) ?? 0) + 1);
      }
    }
  }
  const dtcFrequency = [...dtcMap.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Mileage distribution (buckets in km)
  const mileageBuckets = [
    { label: "~10,000", min: 0, max: 10000 },
    { label: "10,001~30,000", min: 10001, max: 30000 },
    { label: "30,001~60,000", min: 30001, max: 60000 },
    { label: "60,001~100,000", min: 60001, max: 100000 },
    { label: "100,001~", min: 100001, max: Infinity },
  ];
  const mileageDistribution = mileageBuckets.map(({ label, min, max }) => ({
    bucket: label,
    count: rows.filter((r) => {
      if (!r.mileageKm) return false;
      const km = parseFloat(r.mileageKm);
      return km >= min && km <= max;
    }).length,
  }));

  // Monthly trend
  const monthMap = new Map<string, number>();
  for (const r of rows) {
    if (r.receivedAt) {
      const d = new Date(r.receivedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }
  }
  const monthlyTrend = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // Summary stats
  const mileageValues = rows.map((r) => r.mileageKm ? parseFloat(r.mileageKm) : null).filter((v): v is number => v !== null);
  const usageValues = rows.map((r) => r.usageMonths).filter((v): v is number => v !== null);
  const avgMileage = mileageValues.length > 0 ? Math.round(mileageValues.reduce((a, b) => a + b, 0) / mileageValues.length) : null;
  const avgUsageMonths = usageValues.length > 0 ? Math.round(usageValues.reduce((a, b) => a + b, 0) / usageValues.length) : null;

  // Severity distribution
  const severityMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.severity || "unknown";
    severityMap.set(key, (severityMap.get(key) ?? 0) + 1);
  }
  const severityDistribution = [...severityMap.entries()].map(([severity, count]) => ({ severity, count }));

  // Recent claims (top 10)
  const recentClaims = rows.slice(0, 10).map((r) => ({
    complaintId: r.complaintId,
    complaintNumber: r.complaintNumber,
    title: r.title,
    receivedAt: r.receivedAt,
    status: r.status,
    severity: r.severity,
    vehicleModel: r.vehicleModel,
    region: r.region,
    mileageKm: r.mileageKm ? parseFloat(r.mileageKm) : null,
    customerName: r.customerName,
    partName: r.partName,
  }));

  return NextResponse.json({
    summary: {
      total: rows.length,
      avgMileage,
      avgUsageMonths,
      withDtc: rows.filter((r) => r.dtcCodes && r.dtcCodes.length > 0).length,
    },
    vehicleModelCounts,
    regionCounts,
    dtcFrequency,
    mileageDistribution,
    monthlyTrend,
    severityDistribution,
    recentClaims,
  });
}
