import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { internalNCs, partNCs, customerComplaints, ncCustomers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NewLLForm } from "./new-ll-form";

export default async function NewLessonsLearnedPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const [ncs, pncs, complaints] = await Promise.all([
    db
      .select({
        id: internalNCs.id,
        ncNumber: internalNCs.ncNumber,
        title: internalNCs.title,
        description: internalNCs.description,
        severity: internalNCs.severity,
        rootCause: internalNCs.description, // best available field
      })
      .from(internalNCs)
      .where(eq(internalNCs.orgId, session.user.organizationId))
      .orderBy(desc(internalNCs.createdAt))
      .limit(200),

    db
      .select({
        id: partNCs.id,
        pncNumber: partNCs.pncNumber,
        title: partNCs.title,
        description: partNCs.description,
        severity: partNCs.severity,
        rootCause: partNCs.description, // best available field
      })
      .from(partNCs)
      .where(eq(partNCs.orgId, session.user.organizationId))
      .orderBy(desc(partNCs.createdAt))
      .limit(200),

    db
      .select({
        id: customerComplaints.id,
        complaintNumber: customerComplaints.complaintNumber,
        title: customerComplaints.title,
        description: customerComplaints.customerDescription,
        severity: customerComplaints.severity,
        customerName: ncCustomers.name,
      })
      .from(customerComplaints)
      .leftJoin(ncCustomers, eq(customerComplaints.customerId, ncCustomers.id))
      .where(eq(customerComplaints.orgId, session.user.organizationId))
      .orderBy(desc(customerComplaints.createdAt))
      .limit(200),
  ]);

  return <NewLLForm ncs={ncs} pncs={pncs} complaints={complaints} />;
}
