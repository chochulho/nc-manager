import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { internalNCs, ncParts, ncCategoriesL2 } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { InternalNCList } from "./internal-nc-list";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";

export default async function InternalNCPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const sp = await searchParams;
  const { year, period } = parsePeriodParams(sp.year, sp.period);
  const range = periodToDateRange(year, period);

  const conditions = [eq(internalNCs.orgId, session.user.organizationId)];
  if (range) {
    conditions.push(gte(internalNCs.discoveredAt, range.gte));
    conditions.push(lte(internalNCs.discoveredAt, range.lte));
  }

  const ncs = await db
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
    .limit(500);

  return <InternalNCList items={ncs} year={year} period={period} />;
}
