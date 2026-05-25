import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { lessonsLearned, internalNCs, customerComplaints, ncCustomers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { LLDetailClient } from "./ll-detail-client";

export default async function LLDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const { id } = await params;

  const [item] = await db
    .select({
      id: lessonsLearned.id,
      llNumber: lessonsLearned.llNumber,
      title: lessonsLearned.title,
      sourceInternalNcId: lessonsLearned.sourceInternalNcId,
      sourceComplaintId: lessonsLearned.sourceComplaintId,
      problemSummary: lessonsLearned.problemSummary,
      rootCause: lessonsLearned.rootCause,
      actionsTaken: lessonsLearned.actionsTaken,
      keyLearning: lessonsLearned.keyLearning,
      preventionMeasures: lessonsLearned.preventionMeasures,
      applicableAreas: lessonsLearned.applicableAreas,
      tags: lessonsLearned.tags,
      status: lessonsLearned.status,
      createdByUserId: lessonsLearned.createdByUserId,
      createdAt: lessonsLearned.createdAt,
      updatedAt: lessonsLearned.updatedAt,
      // joined
      ncNumber: internalNCs.ncNumber,
      ncTitle: internalNCs.title,
      ncSeverity: internalNCs.severity,
      complaintNumber: customerComplaints.complaintNumber,
      complaintTitle: customerComplaints.title,
      complaintSeverity: customerComplaints.severity,
      customerName: ncCustomers.name,
    })
    .from(lessonsLearned)
    .leftJoin(internalNCs, eq(lessonsLearned.sourceInternalNcId, internalNCs.id))
    .leftJoin(customerComplaints, eq(lessonsLearned.sourceComplaintId, customerComplaints.id))
    .leftJoin(ncCustomers, eq(customerComplaints.customerId, ncCustomers.id))
    .where(
      and(
        eq(lessonsLearned.id, id),
        eq(lessonsLearned.orgId, session.user.organizationId)
      )
    );

  if (!item) notFound();

  return <LLDetailClient item={item} />;
}
