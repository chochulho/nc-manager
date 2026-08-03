import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncReportTemplates, type ReportTemplateBlock } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, customerId, isDefault, accentColor, blocks } = body as {
    name?: string; customerId?: string | null; isDefault?: boolean; accentColor?: string; blocks?: ReportTemplateBlock[];
  };

  const [updated] = await db
    .update(ncReportTemplates)
    .set({
      name,
      customerId: customerId || null,
      isDefault,
      accentColor,
      blocks,
      updatedAt: new Date(),
    })
    .where(and(eq(ncReportTemplates.id, id), eq(ncReportTemplates.orgId, session.user.organizationId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .update(ncReportTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(ncReportTemplates.id, id), eq(ncReportTemplates.orgId, session.user.organizationId)));

  return NextResponse.json({ ok: true });
}
