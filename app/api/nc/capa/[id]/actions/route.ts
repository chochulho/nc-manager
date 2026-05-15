import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas, capaActions } from "@/lib/db/schema";
import { users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendCapaActionAssignmentEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://nc-manager.vercel.app";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [capa] = await db
    .select({ id: capas.id })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actions = await db
    .select()
    .from(capaActions)
    .where(eq(capaActions.capaId, id))
    .orderBy(capaActions.createdAt);

  return NextResponse.json(actions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [capa] = await db
    .select({ id: capas.id, capaNumber: capas.capaNumber, title: capas.title, orgId: capas.orgId })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { actionType, description, responsibleUserId, dueAt } = body;

  if (!actionType || !description) {
    return NextResponse.json({ error: "actionType, description은 필수입니다." }, { status: 400 });
  }

  const [action] = await db
    .insert(capaActions)
    .values({
      capaId: id,
      actionType,
      description,
      responsibleUserId: responsibleUserId ?? null,
      dueAt: dueAt ? new Date(dueAt) : null,
    })
    .returning();

  // responsible 배정 알림
  if (responsibleUserId && responsibleUserId !== session.user.id) {
    try {
      const [responsible] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, responsibleUserId));
      const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, capa.orgId));
      if (responsible?.email) {
        await sendCapaActionAssignmentEmail({
          to: responsible.email,
          recipientName: responsible.name ?? "담당자",
          orgName: org?.name ?? "",
          capaNumber: capa.capaNumber,
          capaTitle: capa.title,
          actionDescription: description,
          dueAt: dueAt ? new Date(dueAt) : null,
          assignerName: session.user.name ?? "관리자",
          capaUrl: `${APP_URL}/capa/${id}`,
        });
      }
    } catch { /* 이메일 실패는 API 응답에 영향 없음 */ }
  }

  return NextResponse.json(action, { status: 201 });
}
