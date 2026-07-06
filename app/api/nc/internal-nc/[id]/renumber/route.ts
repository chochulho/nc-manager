import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalNCs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isRecordAdmin, renumberEntity, logAdminAction } from "@/lib/nc/admin-registry";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecordAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const year = Number(body.year);
  const seq = Number(body.seq);
  if (!Number.isInteger(year) || !Number.isInteger(seq) || seq < 1) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: internalNCs.id, ncNumber: internalNCs.ncNumber })
    .from(internalNCs)
    .where(and(eq(internalNCs.id, id), eq(internalNCs.orgId, session.user.organizationId)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await renumberEntity("internal_nc", id, session.user.organizationId, year, seq);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  await logAdminAction(session.user.organizationId, "internal_nc", id, session.user.id, "renumbered", {
    oldNumber: existing.ncNumber,
    newNumber: result.number,
  });

  return NextResponse.json({ ok: true, number: result.number });
}
