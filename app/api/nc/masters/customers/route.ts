import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncCustomers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(ncCustomers)
    .where(and(eq(ncCustomers.orgId, session.user.organizationId), eq(ncCustomers.isActive, true)))
    .orderBy(ncCustomers.name);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, initialResponseSlaHours, containmentSlaHours, finalReportSlaDays } = body;

  if (!code || !name) return NextResponse.json({ error: "코드와 이름은 필수입니다." }, { status: 400 });

  const [created] = await db
    .insert(ncCustomers)
    .values({
      orgId: session.user.organizationId,
      code,
      name,
      initialResponseSlaHours: initialResponseSlaHours ?? 24,
      containmentSlaHours: containmentSlaHours ?? 48,
      finalReportSlaDays: finalReportSlaDays ?? 15,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
