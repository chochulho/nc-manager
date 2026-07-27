import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isRecordAdmin, unlinkCapaBackReferences, logAdminAction } from "@/lib/nc/admin-registry";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecordAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [existing] = await db
    .select({ id: capas.id })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await unlinkCapaBackReferences(id, session.user.organizationId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  await logAdminAction(session.user.organizationId, "capa", id, session.user.id, "unlinked", {
    unlinked: result.unlinked,
  });

  return NextResponse.json({ ok: true, unlinked: result.unlinked });
}
