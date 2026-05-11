import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas, capaActions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, actionId } = await params;

  const [capa] = await db
    .select({ id: capas.id })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { ...body };

  if (body.status === "completed" && !body.completedAt) {
    updates.completedAt = new Date();
  }

  const [updated] = await db
    .update(capaActions)
    .set(updates as any)
    .where(and(eq(capaActions.id, actionId), eq(capaActions.capaId, id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, actionId } = await params;

  const [capa] = await db
    .select({ id: capas.id })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(capaActions).where(and(eq(capaActions.id, actionId), eq(capaActions.capaId, id)));

  return new NextResponse(null, { status: 204 });
}
