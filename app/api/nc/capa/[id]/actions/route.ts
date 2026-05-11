import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas, capaActions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
    .select({ id: capas.id })
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

  return NextResponse.json(action, { status: 201 });
}
