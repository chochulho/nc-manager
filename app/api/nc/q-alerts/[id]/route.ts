import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { qAlerts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isRecordAdmin, logAdminAction } from "@/lib/nc/admin-registry";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [alert] = await db
    .select()
    .from(qAlerts)
    .where(and(eq(qAlerts.id, id), eq(qAlerts.orgId, session.user.organizationId)));

  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(alert);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [existing] = await db
    .select({ id: qAlerts.id })
    .from(qAlerts)
    .where(and(eq(qAlerts.id, id), eq(qAlerts.orgId, session.user.organizationId)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };

  // 게시 상태로 변경 시 postedAt 자동 기록
  if (body.status === "posted" && !body.postedAt) updates.postedAt = new Date();

  const [updated] = await db
    .update(qAlerts)
    .set(updates as Parameters<typeof db.update>[0] extends never ? never : any)
    .where(eq(qAlerts.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecordAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [existing] = await db
    .select({ id: qAlerts.id, alertNumber: qAlerts.alertNumber, title: qAlerts.title })
    .from(qAlerts)
    .where(and(eq(qAlerts.id, id), eq(qAlerts.orgId, session.user.organizationId)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(qAlerts).where(and(eq(qAlerts.id, id), eq(qAlerts.orgId, session.user.organizationId)));
  await logAdminAction(session.user.organizationId, "q_alert", id, session.user.id, "deleted", { number: existing.alertNumber, title: existing.title });

  return NextResponse.json({ ok: true });
}
