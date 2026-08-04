import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncAnalysisReports, customerComplaints, capas, ncReportTemplates, type ReportBlockValue, type ReportTemplateBlock } from "@/lib/db/schema";
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

const EMPTY_SECTIONS = {
  problemDescription: "",
  rootCause: "",
  conclusion: "",
  followUp: "",
};

function buildFollowUp(capa: { d3InterimContainment: string | null; d5PermanentActions: unknown; d6Implementation: unknown; d7Prevention: unknown }): string {
  const prevention = typeof capa.d7Prevention === "string"
    ? capa.d7Prevention
    : (capa.d7Prevention ? JSON.stringify(capa.d7Prevention) : "");
  return [
    capa.d3InterimContainment ? `[봉쇄조치]\n${capa.d3InterimContainment}` : "",
    extractActions(capa.d5PermanentActions) ? `[영구 시정조치]\n${extractActions(capa.d5PermanentActions)}` : "",
    extractImplementation(capa.d6Implementation) ? `[실행 근거]\n${extractImplementation(capa.d6Implementation)}` : "",
    prevention ? `[재발방지/수평전개]\n${prevention}` : "",
  ].filter(Boolean).join("\n\n");
}

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

  if (!report) return NextResponse.json(null);

  if (!report.templateId) return NextResponse.json({ ...report, template: null });

  const [template] = await db.select().from(ncReportTemplates).where(eq(ncReportTemplates.id, report.templateId));
  return NextResponse.json({ ...report, template: template ?? null });
}

function initBlockData(blocks: ReportTemplateBlock[]): Record<string, ReportBlockValue> {
  return Object.fromEntries(blocks.map((b) => {
    if (b.type === "table") {
      const rows = (b.defaultRows ?? []).map((row) => [...row]);
      return [b.key, { type: "table", rows, attachments: [] } satisfies ReportBlockValue];
    }
    if (b.type === "photo") return [b.key, { type: "photo", url: "" } satisfies ReportBlockValue];
    return [b.key, { type: "text", value: b.defaultValue ?? "", attachments: [] } satisfies ReportBlockValue];
  }));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { complaintId: string; importFromCapa?: boolean; templateId?: string | null };
  const { complaintId, importFromCapa, templateId: explicitTemplateId } = body;

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

  // 템플릿 매칭: 명시 지정 > 고객사 매칭 > 조직 기본값 > 없음(레거시)
  let template: typeof ncReportTemplates.$inferSelect | null = null;
  if (explicitTemplateId) {
    const [t] = await db.select().from(ncReportTemplates)
      .where(and(eq(ncReportTemplates.id, explicitTemplateId), eq(ncReportTemplates.orgId, session.user.organizationId)));
    template = t ?? null;
  } else {
    const [byCustomer] = await db.select().from(ncReportTemplates)
      .where(and(
        eq(ncReportTemplates.orgId, session.user.organizationId),
        eq(ncReportTemplates.customerId, complaint.customerId),
        eq(ncReportTemplates.isActive, true),
      ));
    if (byCustomer) {
      template = byCustomer;
    } else {
      const [byDefault] = await db.select().from(ncReportTemplates)
        .where(and(
          eq(ncReportTemplates.orgId, session.user.organizationId),
          eq(ncReportTemplates.isDefault, true),
          eq(ncReportTemplates.isActive, true),
        ));
      template = byDefault ?? null;
    }
  }

  let sections = { ...EMPTY_SECTIONS };

  if (importFromCapa && complaint.capaId) {
    const [capa] = await db.select().from(capas).where(eq(capas.id, complaint.capaId));
    if (capa) {
      sections = {
        problemDescription: capa.d2Description ?? complaint.customerDescription ?? "",
        rootCause: extractRootCause(capa.d4RootCause),
        conclusion: "",
        followUp: buildFollowUp(capa),
      };
    }
  }

  const [inserted] = await db
    .insert(ncAnalysisReports)
    .values({
      orgId: session.user.organizationId,
      complaintId,
      sections,
      templateId: template?.id ?? null,
      blockData: template ? initBlockData(template.blocks) : null,
      createdByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json({ ...inserted, template }, { status: 201 });
}
