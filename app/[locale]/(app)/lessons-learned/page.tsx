import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lessonsLearned, internalNCs, customerComplaints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { LessonsLearnedList } from "./lessons-learned-list";

export default async function LessonsLearnedPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const items = await db
    .select({
      id: lessonsLearned.id,
      llNumber: lessonsLearned.llNumber,
      title: lessonsLearned.title,
      keyLearning: lessonsLearned.keyLearning,
      tags: lessonsLearned.tags,
      status: lessonsLearned.status,
      createdAt: lessonsLearned.createdAt,
      sourceInternalNcId: lessonsLearned.sourceInternalNcId,
      sourceComplaintId: lessonsLearned.sourceComplaintId,
      ncNumber: internalNCs.ncNumber,
      complaintNumber: customerComplaints.complaintNumber,
    })
    .from(lessonsLearned)
    .leftJoin(internalNCs, eq(lessonsLearned.sourceInternalNcId, internalNCs.id))
    .leftJoin(customerComplaints, eq(lessonsLearned.sourceComplaintId, customerComplaints.id))
    .where(eq(lessonsLearned.orgId, session.user.organizationId))
    .orderBy(desc(lessonsLearned.createdAt))
    .limit(500);

  return <LessonsLearnedList items={items} />;
}
