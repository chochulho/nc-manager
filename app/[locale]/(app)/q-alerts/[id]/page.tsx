import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { qAlerts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { QAlertDetailClient } from "./q-alert-detail-client";

export default async function QAlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const { id } = await params;

  const [alert] = await db
    .select()
    .from(qAlerts)
    .where(and(eq(qAlerts.id, id), eq(qAlerts.orgId, session.user.organizationId)));

  if (!alert) notFound();

  return <QAlertDetailClient alert={alert} />;
}
