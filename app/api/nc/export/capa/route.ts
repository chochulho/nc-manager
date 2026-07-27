import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { parsePeriodParams, periodToDateRange, periodLabel } from "@/lib/period-utils";
import * as XLSX from "xlsx";

const SOURCE_LABELS: Record<string, string> = {
  internal_nc: "공정부적합", part_nc: "부품부적합", customer_complaint: "고객클레임",
  audit: "심사", change: "변경관리", gauge: "게이지", other: "기타",
};
const METHODOLOGY_LABELS: Record<string, string> = {
  "8d": "8D", simple_capa: "간단CAPA", a3: "A3",
};
const STATUS_LABELS: Record<string, string> = {
  open: "접수", in_progress: "진행중", actions_implemented: "조치완료",
  effectiveness_monitoring: "유효성모니터링", closed: "종결",
};
const VERDICT_LABELS: Record<string, string> = {
  effective: "유효", not_effective: "미흡", partial: "부분유효",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const { year, period } = parsePeriodParams(sp.get("year") ?? undefined, sp.get("period") ?? undefined);
  const range = periodToDateRange(year, period);

  const conditions = [eq(capas.orgId, session.user.organizationId)];
  if (range) {
    conditions.push(gte(capas.createdAt, range.gte));
    conditions.push(lte(capas.createdAt, range.lte));
  }

  const capaRows = await db
    .select({
      capaNumber: capas.capaNumber,
      title: capas.title,
      sourceType: capas.sourceType,
      methodology: capas.methodology,
      status: capas.status,
      championUserId: capas.championUserId,
      problemStatement: capas.problemStatement,
      effectivenessVerdict: capas.effectivenessVerdict,
      effectivenessReviewDueAt: capas.effectivenessReviewDueAt,
      effectivenessReviewedAt: capas.effectivenessReviewedAt,
      fmeaRef: capas.fmeaRef,
      changeRef: capas.changeRef,
      closedAt: capas.closedAt,
      createdAt: capas.createdAt,
    })
    .from(capas)
    .where(and(...conditions))
    .orderBy(desc(capas.createdAt))
    .limit(5000);

  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString("ko-KR") : "";

  const data = capaRows.map((r) => ({
    "CAPA번호": r.capaNumber,
    "제목": r.title,
    "출처유형": SOURCE_LABELS[r.sourceType] ?? r.sourceType,
    "방법론": METHODOLOGY_LABELS[r.methodology] ?? r.methodology,
    "상태": STATUS_LABELS[r.status] ?? r.status,
    "담당자ID(Champion)": r.championUserId ?? "",
    "문제설명": r.problemStatement ?? "",
    "유효성평가": r.effectivenessVerdict ? (VERDICT_LABELS[r.effectivenessVerdict] ?? r.effectivenessVerdict) : "",
    "유효성검토기한": fmt(r.effectivenessReviewDueAt),
    "유효성검토완료": fmt(r.effectivenessReviewedAt),
    "FMEA참조": r.fmeaRef ?? "",
    "변경관리CR": r.changeRef ?? "",
    "종결일": fmt(r.closedAt),
    "등록일": fmt(r.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CAPA");

  ws["!cols"] = [
    { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
    { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
  ];

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const label = periodLabel(year, period).replace(/\s/g, "_");
  const filename = `CAPA_${label}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
