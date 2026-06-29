import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { qAlerts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { QAlertList } from "./q-alert-list";

export default async function QAlertsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const items = await db
    .select()
    .from(qAlerts)
    .where(eq(qAlerts.orgId, session.user.organizationId))
    .orderBy(desc(qAlerts.createdAt))
    .limit(500);

  return <QAlertList items={items} />;
}
