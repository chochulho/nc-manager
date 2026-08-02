import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { internalNCs, partNCs, customerComplaints, ncAnalysisReports, ncSequences } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NewCAPAForm } from "./new-capa-form";

export default async function NewCAPAPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceType?: string; sourceId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const orgId = session.user.organizationId;
  const sp = await searchParams;
  const { sourceType, sourceId } = sp;

  let sourceLabel = "";
  let sourceNumber = "";
  let sourceTitle = "";
  let sourceDescription = "";

  if (sourceType === "internal_nc" && sourceId) {
    const [nc] = await db
      .select({ ncNumber: internalNCs.ncNumber, title: internalNCs.title, description: internalNCs.description })
      .from(internalNCs)
      .where(and(eq(internalNCs.id, sourceId), eq(internalNCs.orgId, orgId)));
    if (nc) {
      sourceNumber = nc.ncNumber;
      sourceLabel = `[${nc.ncNumber}] ${nc.title}`;
      sourceTitle = nc.title;
      sourceDescription = nc.description ?? "";
    }
  } else if (sourceType === "part_nc" && sourceId) {
    const [pnc] = await db
      .select({ pncNumber: partNCs.pncNumber, title: partNCs.title, description: partNCs.description })
      .from(partNCs)
      .where(and(eq(partNCs.id, sourceId), eq(partNCs.orgId, orgId)));
    if (pnc) {
      sourceNumber = pnc.pncNumber;
      sourceLabel = `[${pnc.pncNumber}] ${pnc.title}`;
      sourceTitle = pnc.title;
      sourceDescription = pnc.description ?? "";
    }
  } else if (sourceType === "customer_complaint" && sourceId) {
    const [cc] = await db
      .select({
        complaintNumber: customerComplaints.complaintNumber,
        title: customerComplaints.title,
        customerDescription: customerComplaints.customerDescription,
      })
      .from(customerComplaints)
      .where(and(eq(customerComplaints.id, sourceId), eq(customerComplaints.orgId, orgId)));
    if (cc) {
      sourceNumber = cc.complaintNumber;
      sourceLabel = `[${cc.complaintNumber}] ${cc.title}`;
      sourceTitle = cc.title;
      sourceDescription = cc.customerDescription ?? "";
    }
    // 분석보고서가 있으면 problemDescription으로 우선 대체
    const [ar] = await db
      .select({ sections: ncAnalysisReports.sections })
      .from(ncAnalysisReports)
      .where(and(eq(ncAnalysisReports.complaintId, sourceId), eq(ncAnalysisReports.orgId, orgId)));
    if (ar?.sections?.problemDescription) {
      sourceDescription = ar.sections.problemDescription;
    }
  }

  const currentYear = new Date().getFullYear();
  const [seqRow] = await db
    .select({ lastSeq: ncSequences.lastSeq })
    .from(ncSequences)
    .where(and(eq(ncSequences.orgId, orgId), eq(ncSequences.entityType, "capa"), eq(ncSequences.year, currentYear)));
  const previewCapaNumber = `CAPA-${currentYear}-${String((seqRow?.lastSeq ?? 0) + 1).padStart(4, "0")}`;

  const [ncList, partNcList, complaintList] = await Promise.all([
    db.select({ id: internalNCs.id, ncNumber: internalNCs.ncNumber, title: internalNCs.title })
      .from(internalNCs)
      .where(eq(internalNCs.orgId, orgId))
      .orderBy(internalNCs.createdAt),
    db.select({ id: partNCs.id, pncNumber: partNCs.pncNumber, title: partNCs.title })
      .from(partNCs)
      .where(eq(partNCs.orgId, orgId))
      .orderBy(partNCs.createdAt),
    db.select({ id: customerComplaints.id, complaintNumber: customerComplaints.complaintNumber, title: customerComplaints.title })
      .from(customerComplaints)
      .where(eq(customerComplaints.orgId, orgId))
      .orderBy(customerComplaints.createdAt),
  ]);

  return (
    <NewCAPAForm
      sourceType={sourceType ?? ""}
      sourceId={sourceId ?? ""}
      sourceLabel={sourceLabel}
      sourceNumber={sourceNumber}
      initialTitle={sourceTitle}
      initialProblemStatement={sourceDescription}
      previewCapaNumber={previewCapaNumber}
      ncList={ncList}
      partNcList={partNcList}
      complaintList={complaintList}
    />
  );
}
