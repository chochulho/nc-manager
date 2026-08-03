import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncAnalysisReports, capas, type ReportBlockValue } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

function extractRootCause(d4: unknown): string {
  if (!d4) return "";
  if (typeof d4 === "string") return d4;
  if (Array.isArray(d4)) {
    return (d4 as Array<{ why?: string; because?: string }>)
      .filter((row) => row.why || row.because)
      .map((row, i) => `Q${i + 1}: ${row.why ?? ""}\nA: ${row.because ?? ""}`)
      .join("\n");
  }
  return "";
}

function extractActions(d5: unknown): string {
  if (!d5 || !Array.isArray(d5)) return "";
  return (d5 as Array<{ description?: string; responsible?: string }>)
    .filter((a) => a.description)
    .map((a) => `• ${a.description}${a.responsible ? ` (담당: ${a.responsible})` : ""}`)
    .join("\n");
}

function extractImplementation(d6: unknown): string {
  if (!d6 || !Array.isArray(d6)) return "";
  return (d6 as Array<{ description?: string; evidence?: string }>)
    .filter((a) => a.description)
    .map((a) => `• ${a.description}${a.evidence ? ` — 근거: ${a.evidence}` : ""}`)
    .join("\n");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    sections?: Record<string, string>;
    blockData?: Record<string, ReportBlockValue>;
    status?: "draft" | "final";
  };

  const [updated] = await db
    .update(ncAnalysisReports)
    .set({
      ...(body.sections && { sections: body.sections as typeof ncAnalysisReports.$inferInsert["sections"] }),
      ...(body.blockData && { blockData: body.blockData }),
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

  const [existing] = await db.select().from(ncAnalysisReports).where(eq(ncAnalysisReports.id, id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [capa] = await db.select().from(capas).where(eq(capas.id, capaId));
  if (!capa) return NextResponse.json({ error: "CAPA not found" }, { status: 404 });

  const prevention = typeof capa.d7Prevention === "string"
    ? capa.d7Prevention
    : (capa.d7Prevention ? JSON.stringify(capa.d7Prevention) : "");
  const followUp = [
    capa.d3InterimContainment ? `[봉쇄조치]\n${capa.d3InterimContainment}` : "",
    extractActions(capa.d5PermanentActions) ? `[영구 시정조치]\n${extractActions(capa.d5PermanentActions)}` : "",
    extractImplementation(capa.d6Implementation) ? `[실행 근거]\n${extractImplementation(capa.d6Implementation)}` : "",
    prevention ? `[재발방지/수평전개]\n${prevention}` : "",
  ].filter(Boolean).join("\n\n");

  const mappedSections = {
    ...existing.sections,
    problemDescription: capa.d2Description ?? "",
    rootCause: extractRootCause(capa.d4RootCause),
    followUp,
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
