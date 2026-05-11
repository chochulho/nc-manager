import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncParts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(ncParts)
    .where(and(eq(ncParts.orgId, session.user.organizationId), eq(ncParts.isActive, true)))
    .orderBy(ncParts.partNumber);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partNumber, partName, customerId } = await req.json();
  if (!partNumber || !partName) return NextResponse.json({ error: "품번과 품명은 필수입니다." }, { status: 400 });

  const [created] = await db
    .insert(ncParts)
    .values({
      orgId: session.user.organizationId,
      partNumber,
      partName,
      customerId: customerId || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
