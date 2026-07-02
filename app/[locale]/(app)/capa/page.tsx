import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { capas } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { CAPAList } from "./capa-list";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";

export default async function CAPAPage({
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
  const siteFilter = buildSiteFilter(session.user.allowedSiteIds, capas.siteId, selectedSiteId);

  const conditions = [eq(capas.orgId, session.user.organizationId)];
  if (siteFilter) conditions.push(siteFilter);
  if (range) {
    conditions.push(gte(capas.createdAt, range.gte));
    conditions.push(lte(capas.createdAt, range.lte));
  }

  const items = await db
    .select()
    .from(capas)
    .where(and(...conditions))
    .orderBy(desc(capas.createdAt))
    .limit(500);

  return <CAPAList items={items} year={year} period={period} />;
}
