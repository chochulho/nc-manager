import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { internalNCs, ncSites, ncProcesses, ncParts, ncSuppliers, ncCategoriesL2, capas } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { isRecordAdmin } from "@/lib/nc/admin-registry";
import { NCDetailClient } from "./nc-detail-client";

export default async function NCDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const { id } = await params;
  const orgId = session.user.organizationId;

  const [[nc], sites, processes, parts, suppliers, categoriesL2] = await Promise.all([
    db.select().from(internalNCs).where(and(eq(internalNCs.id, id), eq(internalNCs.orgId, orgId))),
    db.select({ id: ncSites.id, name: ncSites.name, code: ncSites.code }).from(ncSites).where(and(eq(ncSites.orgId, orgId), eq(ncSites.isActive, true))),
    db.select({ id: ncProcesses.id, name: ncProcesses.name, code: ncProcesses.code }).from(ncProcesses).where(and(eq(ncProcesses.orgId, orgId), eq(ncProcesses.isActive, true))),
    db.select({ id: ncParts.id, name: ncParts.partName, number: ncParts.partNumber }).from(ncParts).where(and(eq(ncParts.orgId, orgId), eq(ncParts.isActive, true))),
    db.select({ id: ncSuppliers.id, name: ncSuppliers.name, code: ncSuppliers.code }).from(ncSuppliers).where(and(eq(ncSuppliers.orgId, orgId), eq(ncSuppliers.isActive, true))),
    db.select({ id: ncCategoriesL2.id, code: ncCategoriesL2.code, nameKo: ncCategoriesL2.nameKo }).from(ncCategoriesL2).where(isNull(ncCategoriesL2.orgId)),
  ]);

  if (!nc) redirect("/internal-nc");

  const linkedCapa = nc.capaId
    ? await db.select({ id: capas.id, capaNumber: capas.capaNumber, status: capas.status }).from(capas).where(eq(capas.id, nc.capaId)).then((r) => r[0] ?? null)
    : null;

  return (
    <NCDetailClient
      nc={nc}
      sites={sites}
      processes={processes}
      parts={parts}
      suppliers={suppliers}
      categoriesL2={categoriesL2}
      linkedCapa={linkedCapa}
      isOrgAdmin={isRecordAdmin(session)}
    />
  );
}
