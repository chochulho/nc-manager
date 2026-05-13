import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncAnalysisReports, customerComplaints, capas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const EMPTY_SECTIONS = {
  problemDescription: "",
  immediateContainment: "",
  rootCause: "",
  permanentActions: "",
  prevention: "",
  conclusion: "",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const complaintId = new URL(req.url).searchParams.get("complaintId");
  if (!complaintId) return NextResponse.json({ error: "complaintId required" }, { status: 400 });

  const [report] = await db
    .select()
    .from(ncAnalysisReports)
    .where(
      and(
        eq(ncAnalysisReports.orgId, session.user.organizationId),
        eq(ncAnalysisReports.complaintId, complaintId),
      )
    );

  return NextResponse.json(report ?? null);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { complaintId: string; importFromCapa?: boolean };
  const { complaintId, importFromCapa } = body;

  const [complaint] = await db
    .select()
    .from(customerComplaints)
    .where(
      and(
        eq(customerComplaints.id, complaintId),
        eq(customerComplaints.orgId, session.user.organizationId),
      )
    );
  if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db
    .select({ id: ncAnalysisReports.id })
    .from(ncAnalysisReports)
    .where(eq(ncAnalysisReports.complaintId, complaintId))
    .then((r) => r[0] ?? null);
  if (existing) return NextResponse.json({ error: "이미 분석보고서가 존재합니다." }, { status: 409 });

  let sections = { ...EMPTY_SECTIONS };

  if (importFromCapa && complaint.capaId) {
    const [capa] = await db.select().from(capas).where(eq(capas.id, complaint.capaId));
    if (capa) {
      sections = {
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
        conclusion: "",
      };
    }
  }

  const [inserted] = await db
    .insert(ncAnalysisReports)
    .values({
      orgId: session.user.organizationId,
      complaintId,
      sections,
      createdByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
