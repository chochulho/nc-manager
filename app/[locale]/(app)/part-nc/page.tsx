import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { partNCs, ncParts, ncCategoriesL2, ncSuppliers } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { PartNCList } from "./part-nc-list";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";
import { PAGE_SIZE, parsePageParam, totalPagesFor } from "@/lib/pagination";

export default async function PartNCPage({
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
  const siteFilter = buildSiteFilter(session.user.allowedSiteIds, partNCs.occurrenceSiteId, selectedSiteId);

  const conditions = [eq(partNCs.orgId, session.user.organizationId)];
  if (siteFilter) conditions.push(siteFilter);
  if (range) {
    conditions.push(gte(partNCs.discoveredAt, range.gte));
    conditions.push(lte(partNCs.discoveredAt, range.lte));
  }

  const [pncs, [{ total }]] = await Promise.all([
    db
      .select({
        id: partNCs.id,
        pncNumber: partNCs.pncNumber,
        title: partNCs.title,
        discoveredAt: partNCs.discoveredAt,
        discoveryStage: partNCs.discoveryStage,
        severity: partNCs.severity,
        status: partNCs.status,
        safetyRelated: partNCs.safetyRelated,
        partName: ncParts.partName,
        partNumber: ncParts.partNumber,
        supplierName: ncSuppliers.name,
        categoryCode: ncCategoriesL2.code,
      })
      .from(partNCs)
      .leftJoin(ncParts, eq(partNCs.partId, ncParts.id))
      .leftJoin(ncSuppliers, eq(partNCs.occurrenceSupplierId, ncSuppliers.id))
      .leftJoin(ncCategoriesL2, eq(partNCs.categoryL2Id, ncCategoriesL2.id))
      .where(and(...conditions))
      .orderBy(desc(partNCs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(partNCs).where(and(...conditions)),
  ]);

  return (
    <PartNCList
      items={pncs}
      year={year}
      period={period}
      page={page}
      totalPages={totalPagesFor(total)}
      totalCount={total}
    />
  );
}
