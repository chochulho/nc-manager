import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customerComplaints, ncCustomers, ncParts, ncCategoriesL2, capas } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { ComplaintDetailClient } from "./complaint-detail-client";

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const { id } = await params;
  const orgId = session.user.organizationId;

  const [[complaint], customers, parts, categoriesL2] = await Promise.all([
    db.select().from(customerComplaints).where(and(eq(customerComplaints.id, id), eq(customerComplaints.orgId, orgId))),
    db.select({ id: ncCustomers.id, name: ncCustomers.name, code: ncCustomers.code }).from(ncCustomers).where(and(eq(ncCustomers.orgId, orgId), eq(ncCustomers.isActive, true))),
    db.select({ id: ncParts.id, name: ncParts.partName, number: ncParts.partNumber }).from(ncParts).where(and(eq(ncParts.orgId, orgId), eq(ncParts.isActive, true))),
    db.select({ id: ncCategoriesL2.id, code: ncCategoriesL2.code, nameKo: ncCategoriesL2.nameKo }).from(ncCategoriesL2).where(isNull(ncCategoriesL2.orgId)),
  ]);

  if (!complaint) redirect("/complaints");

  const linkedCapa = complaint.capaId
    ? await db.select({ id: capas.id, capaNumber: capas.capaNumber, status: capas.status }).from(capas).where(eq(capas.id, complaint.capaId)).then((r) => r[0] ?? null)
    : null;

  return <ComplaintDetailClient complaint={complaint} customers={customers} parts={parts} categoriesL2={categoriesL2} linkedCapa={linkedCapa} />;
}
