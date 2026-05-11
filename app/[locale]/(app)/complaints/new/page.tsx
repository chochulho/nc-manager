import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ncCustomers, ncParts, ncCategoriesL2 } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { NewComplaintForm } from "./new-complaint-form";

export default async function NewComplaintPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const orgId = session.user.organizationId;

  const [customers, parts, categoriesL2] = await Promise.all([
    db.select({ id: ncCustomers.id, name: ncCustomers.name, code: ncCustomers.code }).from(ncCustomers).where(and(eq(ncCustomers.orgId, orgId), eq(ncCustomers.isActive, true))),
    db.select({ id: ncParts.id, name: ncParts.partName, number: ncParts.partNumber }).from(ncParts).where(and(eq(ncParts.orgId, orgId), eq(ncParts.isActive, true))),
    db.select({ id: ncCategoriesL2.id, code: ncCategoriesL2.code, nameKo: ncCategoriesL2.nameKo }).from(ncCategoriesL2).where(isNull(ncCategoriesL2.orgId)),
  ]);

  return <NewComplaintForm customers={customers} parts={parts} categoriesL2={categoriesL2} />;
}
