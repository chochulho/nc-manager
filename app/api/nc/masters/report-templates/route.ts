import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncReportTemplates, type ReportTemplateBlock } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = new URL(req.url).searchParams.get("customerId");

  const items = await db
    .select()
    .from(ncReportTemplates)
    .where(
      and(
        eq(ncReportTemplates.orgId, session.user.organizationId),
        eq(ncReportTemplates.isActive, true),
        customerId ? or(eq(ncReportTemplates.customerId, customerId), isNull(ncReportTemplates.customerId)) : undefined,
      )
    )
    .orderBy(ncReportTemplates.name);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, customerId, isDefault, accentColor, blocks } = body as {
    name?: string; customerId?: string | null; isDefault?: boolean; accentColor?: string; blocks?: ReportTemplateBlock[];
  };

  if (!name || !blocks?.length) {
    return NextResponse.json({ error: "이름과 블록 구성은 필수입니다." }, { status: 400 });
  }

  const [created] = await db
    .insert(ncReportTemplates)
    .values({
      orgId: session.user.organizationId,
      name,
      customerId: customerId || null,
      isDefault: isDefault ?? false,
      accentColor: accentColor || "1E40AF",
      blocks,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
