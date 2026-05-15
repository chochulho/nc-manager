import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customerComplaints, ncCustomers, ncParts, users } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { parsePeriodParams, periodToDateRange, periodLabel } from "@/lib/period-utils";
import * as XLSX from "xlsx";

const DISCOVERY_STAGE_LABELS: Record<string, string> = {
  inline_0km: "인라인/0km", field: "필드", warranty: "보증", other: "기타",
};
const SEVERITY_LABELS: Record<string, string> = { critical: "치명", major: "주요", minor: "경미" };
const STATUS_LABELS: Record<string, string> = {
  received: "접수", acknowledged: "확인", contained: "봉쇄",
  investigating: "조사중", "8d_in_progress": "8D진행",
  final_reported: "최종보고", closed: "종결", closed_ntf: "종결(NTF)",
};
const CHANNEL_LABELS: Record<string, string> = {
  portal: "포털", email: "이메일", phone: "전화", meeting: "회의", informal: "비공식",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const { year, period } = parsePeriodParams(sp.get("year") ?? undefined, sp.get("period") ?? undefined);
  const range = periodToDateRange(year, period);

  const conditions = [eq(customerComplaints.orgId, session.user.organizationId)];
  if (range) {
    conditions.push(gte(customerComplaints.receivedAt, range.gte));
    conditions.push(lte(customerComplaints.receivedAt, range.lte));
  }

  const rows = await db
    .select({
      complaintNumber: customerComplaints.complaintNumber,
      title: customerComplaints.title,
      receivedAt: customerComplaints.receivedAt,
      discoveryStage: customerComplaints.discoveryStage,
      severity: customerComplaints.severity,
      status: customerComplaints.status,
      safetyRelated: customerComplaints.safetyRelated,
      recallRisk: customerComplaints.recallRisk,
      isFormal: customerComplaints.isFormal,
      receivedChannel: customerComplaints.receivedChannel,
      lotNumber: customerComplaints.lotNumber,
      quantityClaimed: customerComplaints.quantityClaimed,
      quantityConfirmed: customerComplaints.quantityConfirmed,
      initialResponseDueAt: customerComplaints.initialResponseDueAt,
      initialResponseSentAt: customerComplaints.initialResponseSentAt,
      finalReportDueAt: customerComplaints.finalReportDueAt,
      finalReportSentAt: customerComplaints.finalReportSentAt,
      description: customerComplaints.customerDescription,
      createdAt: customerComplaints.createdAt,
      customerName: ncCustomers.name,
      partName: ncParts.partName,
      partNumber: ncParts.partNumber,
      receivedByName: users.name,
    })
    .from(customerComplaints)
    .leftJoin(ncCustomers, eq(customerComplaints.customerId, ncCustomers.id))
    .leftJoin(ncParts, eq(customerComplaints.partId, ncParts.id))
    .leftJoin(users, eq(customerComplaints.receivedByUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(customerComplaints.receivedAt))
    .limit(5000);

  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString("ko-KR") : "";

  const data = rows.map((r) => ({
    "클레임번호": r.complaintNumber,
    "제목": r.title,
    "고객사": r.customerName ?? "",
    "접수일": fmt(r.receivedAt),
    "발견단계": DISCOVERY_STAGE_LABELS[r.discoveryStage] ?? r.discoveryStage,
    "심각도": SEVERITY_LABELS[r.severity] ?? r.severity,
    "상태": STATUS_LABELS[r.status] ?? r.status,
    "안전관련": r.safetyRelated ? "Y" : "N",
    "리콜위험": r.recallRisk ? "Y" : "N",
    "공식여부": r.isFormal ? "공식" : "비공식",
    "접수경로": CHANNEL_LABELS[r.receivedChannel] ?? r.receivedChannel,
    "부품명": r.partName ?? "",
    "부품번호": r.partNumber ?? "",
    "LOT번호": r.lotNumber ?? "",
    "클레임수량": r.quantityClaimed ?? "",
    "확인수량": r.quantityConfirmed ?? "",
    "초기대응기한": fmt(r.initialResponseDueAt),
    "초기대응완료": fmt(r.initialResponseSentAt),
    "최종보고기한": fmt(r.finalReportDueAt),
    "최종보고완료": fmt(r.finalReportSentAt),
    "내용": r.description ?? "",
    "접수담당자": r.receivedByName ?? "",
    "등록일": fmt(r.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "고객클레임");

  ws["!cols"] = [
    { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 40 }, { wch: 12 }, { wch: 12 },
  ];

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const label = periodLabel(year, period).replace(/\s/g, "_");
  const filename = `고객클레임_${label}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
