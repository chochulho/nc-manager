import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncProcesses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(ncProcesses)
    .where(and(eq(ncProcesses.orgId, session.user.organizationId), eq(ncProcesses.isActive, true)))
    .orderBy(ncProcesses.name);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, name, siteId } = await req.json();
  if (!code || !name) return NextResponse.json({ error: "코드와 이름은 필수입니다." }, { status: 400 });

  const [created] = await db
    .insert(ncProcesses)
    .values({
      orgId: session.user.organizationId,
      code,
      name,
      siteId: siteId || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
