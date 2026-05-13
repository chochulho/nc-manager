import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncAnalysisReports, capas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { sections?: Record<string, string>; status?: "draft" | "final" };

  const [updated] = await db
    .update(ncAnalysisReports)
    .set({
      ...(body.sections && { sections: body.sections as typeof ncAnalysisReports.$inferInsert["sections"] }),
      ...(body.status && { status: body.status }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ncAnalysisReports.id, id),
        eq(ncAnalysisReports.orgId, session.user.organizationId),
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(ncAnalysisReports)
    .where(
      and(
        eq(ncAnalysisReports.id, id),
        eq(ncAnalysisReports.orgId, session.user.organizationId),
      )
    );

  return new NextResponse(null, { status: 204 });
}

// CAPA에서 최신 데이터 가져오기 (덮어쓰기)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { capaId } = await req.json() as { capaId: string };

  const [capa] = await db.select().from(capas).where(eq(capas.id, capaId));
  if (!capa) return NextResponse.json({ error: "CAPA not found" }, { status: 404 });

  const mappedSections = {
    problemDescription: capa.d2Description ?? "",
    immediateContainment: capa.d3InterimContainment ?? "",
    rootCause: typeof capa.d4RootCause === "object" && capa.d4RootCause
      ? JSON.stringify(capa.d4RootCause, null, 2)
      : String(capa.d4RootCause ?? ""),
    permanentActions: [
      capa.d5PermanentActions ? JSON.stringify(capa.d5PermanentActions) : "",
      capa.d6Implementation ? JSON.stringify(capa.d6Implementation) : "",
    ].filter(Boolean).join("\n"),
    prevention: typeof capa.d7Prevention === "object" && capa.d7Prevention
      ? JSON.stringify(capa.d7Prevention, null, 2)
      : String(capa.d7Prevention ?? ""),
  };

  const [updated] = await db
    .update(ncAnalysisReports)
    .set({ sections: mappedSections as typeof ncAnalysisReports.$inferInsert["sections"], updatedAt: new Date() })
    .where(
      and(
        eq(ncAnalysisReports.id, id),
        eq(ncAnalysisReports.orgId, session.user.organizationId),
      )
    )
    .returning();

  return NextResponse.json(updated);
}
