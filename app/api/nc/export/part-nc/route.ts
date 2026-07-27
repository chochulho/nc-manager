import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { partNCs, ncParts, ncCategoriesL2, ncSuppliers } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { parsePeriodParams, periodToDateRange, periodLabel } from "@/lib/period-utils";
import * as XLSX from "xlsx";

const DISCOVERY_STAGE_LABELS: Record<string, string> = {
  incoming: "수입검사", in_process: "공정중", outgoing: "출하검사",
  internal_audit: "내부심사", msa: "MSA", other: "기타",
};
const SEVERITY_LABELS: Record<string, string> = { critical: "치명", major: "주요", minor: "경미" };
const STATUS_LABELS: Record<string, string> = {
  open: "접수", contained: "봉쇄완료", disposition_decided: "처분결정",
  capa_in_progress: "CAPA진행", closed: "종결",
};
const DISPOSITION_LABELS: Record<string, string> = {
  rework: "재작업", deviation: "특채", scrap: "폐기",
  return_to_supplier: "반품", use_as_is: "그대로사용",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const { year, period } = parsePeriodParams(sp.get("year") ?? undefined, sp.get("period") ?? undefined);
  const range = periodToDateRange(year, period);

  const conditions = [eq(partNCs.orgId, session.user.organizationId)];
  if (range) {
    conditions.push(gte(partNCs.discoveredAt, range.gte));
    conditions.push(lte(partNCs.discoveredAt, range.lte));
  }

  const rows = await db
    .select({
      pncNumber: partNCs.pncNumber,
      title: partNCs.title,
      discoveredAt: partNCs.discoveredAt,
      discoveryStage: partNCs.discoveryStage,
      severity: partNCs.severity,
      status: partNCs.status,
      safetyRelated: partNCs.safetyRelated,
      lotNumber: partNCs.lotNumber,
      quantityInspected: partNCs.quantityInspected,
      quantityNc: partNCs.quantityNc,
      description: partNCs.description,
      dispositionType: partNCs.dispositionType,
      capaRequired: partNCs.capaRequired,
      createdAt: partNCs.createdAt,
      partName: ncParts.partName,
      categoryCode: ncCategoriesL2.code,
      supplierName: ncSuppliers.name,
      discoveredByUserId: partNCs.discoveredByUserId,
    })
    .from(partNCs)
    .leftJoin(ncParts, eq(partNCs.partId, ncParts.id))
    .leftJoin(ncCategoriesL2, eq(partNCs.categoryL2Id, ncCategoriesL2.id))
    .leftJoin(ncSuppliers, eq(partNCs.occurrenceSupplierId, ncSuppliers.id))
    .where(and(...conditions))
    .orderBy(desc(partNCs.discoveredAt))
    .limit(5000);

  const data = rows.map((r) => ({
    "PNC번호": r.pncNumber,
    "제목": r.title,
    "발견일": r.discoveredAt ? new Date(r.discoveredAt).toLocaleDateString("ko-KR") : "",
    "발견단계": DISCOVERY_STAGE_LABELS[r.discoveryStage] ?? r.discoveryStage,
    "심각도": SEVERITY_LABELS[r.severity] ?? r.severity,
    "상태": STATUS_LABELS[r.status] ?? r.status,
    "안전관련": r.safetyRelated ? "Y" : "N",
    "부품명": r.partName ?? "",
    "불량유형": r.categoryCode ?? "",
    "공급업체": r.supplierName ?? "",
    "LOT번호": r.lotNumber ?? "",
    "검사수량": r.quantityInspected ?? "",
    "부적합수량": r.quantityNc ?? "",
    "내용": r.description ?? "",
    "처분유형": r.dispositionType ? (DISPOSITION_LABELS[r.dispositionType] ?? r.dispositionType) : "",
    "CAPA필요": r.capaRequired ? "Y" : "N",
    "발견자(ID)": r.discoveredByUserId ?? "",
    "등록일": r.createdAt ? new Date(r.createdAt).toLocaleDateString("ko-KR") : "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "부품부적합");

  // Column widths
  ws["!cols"] = [
    { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
    { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
    { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 40 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 12 },
  ];

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const label = periodLabel(year, period).replace(/\s/g, "_");
  const filename = `부품부적합_${label}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
