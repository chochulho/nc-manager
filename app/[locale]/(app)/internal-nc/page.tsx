import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { internalNCs, ncParts, ncCategoriesL2 } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { InternalNCList } from "./internal-nc-list";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";
import { PAGE_SIZE, parsePageParam, totalPagesFor } from "@/lib/pagination";

export default async function InternalNCPage({
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
  const siteFilter = buildSiteFilter(session.user.allowedSiteIds, internalNCs.occurrenceSiteId, selectedSiteId);

  const conditions = [eq(internalNCs.orgId, session.user.organizationId)];
  if (siteFilter) conditions.push(siteFilter);
  if (range) {
    conditions.push(gte(internalNCs.discoveredAt, range.gte));
    conditions.push(lte(internalNCs.discoveredAt, range.lte));
  }

  const [ncs, [{ total }]] = await Promise.all([
    db
      .select({
        id: internalNCs.id,
        ncNumber: internalNCs.ncNumber,
        title: internalNCs.title,
        discoveredAt: internalNCs.discoveredAt,
        discoveryStage: internalNCs.discoveryStage,
        severity: internalNCs.severity,
        status: internalNCs.status,
        safetyRelated: internalNCs.safetyRelated,
        partName: ncParts.partName,
        categoryCode: ncCategoriesL2.code,
      })
      .from(internalNCs)
      .leftJoin(ncParts, eq(internalNCs.partId, ncParts.id))
      .leftJoin(ncCategoriesL2, eq(internalNCs.categoryL2Id, ncCategoriesL2.id))
      .where(and(...conditions))
      .orderBy(desc(internalNCs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(internalNCs).where(and(...conditions)),
  ]);

  return (
    <InternalNCList
      items={ncs}
      year={year}
      period={period}
      page={page}
      totalPages={totalPagesFor(total)}
      totalCount={total}
    />
  );
}
