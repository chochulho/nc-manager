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
    .select()
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actions = await db
    .select()
    .from(capaActions)
    .where(eq(capaActions.capaId, id))
    .orderBy(capaActions.createdAt);

  return NextResponse.json({ ...capa, actions });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [existing] = await db
    .select({ id: capas.id })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const updates: Record<string, unknown> = { ...body, updatedAt: now };

  if (body.status === "closed" && !body.closedAt) {
    updates.closedAt = now;
  }
  if (body.effectivenessVerdict && !body.effectivenessReviewedAt) {
    updates.effectivenessReviewedAt = now;
  }

  const [updated] = await db
    .update(capas)
    .set(updates as Parameters<typeof db.update>[0] extends never ? never : any)
    .where(eq(capas.id, id))
    .returning();

  return NextResponse.json(updated);
}
