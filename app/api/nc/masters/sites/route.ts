import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncSites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(ncSites)
    .where(and(eq(ncSites.orgId, session.user.organizationId), eq(ncSites.isActive, true)))
    .orderBy(ncSites.name);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, name } = await req.json();
  if (!code || !name) return NextResponse.json({ error: "코드와 이름은 필수입니다." }, { status: 400 });

  const [created] = await db
    .insert(ncSites)
    .values({ orgId: session.user.organizationId, code, name })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
