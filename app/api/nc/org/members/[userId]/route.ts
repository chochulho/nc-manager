import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgRole, isAdmin, organizationId } = session.user;
  if (orgRole !== "ADMIN" && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;

  const [target] = await db
    .select({ orgRole: users.orgRole, organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target || target.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.orgRole === "ADMIN") {
    return NextResponse.json({ error: "관리자 계정은 제거할 수 없습니다." }, { status: 403 });
  }

  await db.update(users).set({ organizationId: null }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgRole, isAdmin, organizationId } = session.user;
  if (orgRole !== "ADMIN" && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const { orgRole: newRole } = await req.json();

  if (!["ADMIN", "MEMBER"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ orgRole: newRole })
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId!)))
    .returning({ id: users.id, orgRole: users.orgRole });

  return NextResponse.json(updated);
}
