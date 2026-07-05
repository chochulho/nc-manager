"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, MessageSquareWarning, AlertCircle, Clock, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PeriodFilter } from "@/components/nc/period-filter";

interface ComplaintItem {
  id: string;
  complaintNumber: string;
  title: string;
  receivedAt: Date;
  discoveryStage: string;
  severity: string;
  status: string;
  safetyRelated: boolean;
  recallRisk: boolean;
  initialResponseDueAt: Date | null;
  finalReportDueAt: Date | null;
  receivedChannel: string | null;
  capaId: string | null;
  resolutionType: string | null;
  customerName: string | null;
  partName: string | null;
  partNumber: string | null;
  analysisStatus: string | null;
  analysisSections: { rootCause?: string; conclusion?: string } | null;
}

function analysisSnippet(sections: ComplaintItem["analysisSections"]): string | null {
  const text = sections?.conclusion?.trim() || sections?.rootCause?.trim();
  return text || null;
}

const STATUS_COLORS: Record<string, string> = {
  received:        "bg-blue-50 text-blue-700",
  acknowledged:    "bg-indigo-50 text-indigo-700",
  contained:       "bg-yellow-50 text-yellow-700",
  investigating:   "bg-orange-50 text-orange-700",
  "8d_in_progress":"bg-purple-50 text-purple-700",
  final_reported:  "bg-teal-50 text-teal-700",
  closed:          "bg-green-50 text-green-700",
  closed_ntf:      "bg-gray-100 text-gray-600",
};

const STAGE_COLORS: Record<string, string> = {
  inline_0km: "text-red-600",
  field:      "text-orange-600",
  warranty:   "text-yellow-600",
  other:      "text-gray-500",
};

const CHANNEL_LABELS: Record<string, string> = {
  portal:   "포털",
  email:    "이메일",
  phone:    "전화",
  meeting:  "미팅",
  informal: "비공식",
};

const RESOLUTION_LABELS: Record<string, { label: string; className: string }> = {
  confirmed_nc:    { label: "실제 부적합", className: "text-indigo-700 bg-indigo-50" },
  ntf:             { label: "NTF",         className: "text-gray-600  bg-gray-100"   },
  customer_misuse: { label: "고객 귀책",   className: "text-purple-700 bg-purple-50" },
  partial:         { label: "부분 확인",   className: "text-orange-700 bg-orange-50" },
};

function isSlaOverdue(due: Date | null): boolean {
  if (!due) return false;
  return new Date() > due;
}

function daysLeft(due: Date | null): number | null {
  if (!due) return null;
  return Math.ceil((due.getTime() - Date.now()) / 86400000);
}

export function ComplaintList({
  items,
  year,
  period,
}: {
  items: ComplaintItem[];
  year: number;
  period: string;
}) {
  const t = useTranslations("complaint");
  const tCommon = useTranslations("common");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <MessageSquareWarning className="h-6 w-6 text-red-600" />
          {t("title")}
        </h1>
        <div className="flex items-center gap-2">
          <a href={`/api/nc/export/complaints?year=${year}&period=${period}`} download>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </a>
          <Link href="/complaints/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              {t("new")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <Suspense fallback={<div className="h-10" />}>
          <PeriodFilter year={year} period={period} />
        </Suspense>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>{t("emptyState")}</p>
            <Link href="/complaints/new">
              <Button variant="outline" className="mt-4">{t("registerFirst")}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b text-xs text-muted-foreground">
              <span className="font-semibold text-gray-700">{tCommon("totalCount", { count: items.length })}</span>
            </div>

            {/* 헤더 */}
            <div className="hidden md:grid grid-cols-[7rem_1fr_8rem_5rem_7rem_8rem] gap-x-3 px-4 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>{tCommon("number")}</span>
              <span>{tCommon("title")}</span>
              <span>{t("customer")}</span>
              <span>{t("severity")}</span>
              <span>{t("status")}</span>
              <span>{t("sla")}</span>
            </div>

            <ul className="divide-y">
              {items.map((c) => {
                const overdueInitial = isSlaOverdue(c.initialResponseDueAt) && !["closed", "closed_ntf", "acknowledged", "contained", "investigating", "8d_in_progress", "final_reported"].includes(c.status);
                const overdueFinal   = isSlaOverdue(c.finalReportDueAt) && !["closed", "closed_ntf"].includes(c.status);
                const overdue = overdueInitial || overdueFinal;
                const days = daysLeft(c.finalReportDueAt);
                const isClosed = ["closed", "closed_ntf"].includes(c.status);

                return (
                  <li
                    key={c.id}
                    className={`group hover:bg-gray-50/70 transition-colors ${overdue ? "bg-red-50/25" : ""}`}
                  >
                    <Link href={`/complaints/${c.id}`} className="block px-4 py-3">
                      {/* 1행: 번호 | 제목 | 고객사 | 심각도 | 상태 | SLA */}
                      <div className="grid grid-cols-[7rem_1fr_8rem_5rem_7rem_8rem] gap-x-3 items-center">
                        {/* 번호 */}
                        <span className="font-mono text-xs font-semibold text-primary group-hover:underline whitespace-nowrap">
                          {c.complaintNumber}
                        </span>

                        {/* 제목 */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          {c.safetyRelated && <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                          {c.recallRisk    && <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1 rounded shrink-0">리콜</span>}
                          <span className="font-medium text-sm truncate">{c.title}</span>
                        </div>

                        {/* 고객사 */}
                        <span className="text-sm text-muted-foreground truncate">{c.customerName ?? "—"}</span>

                        {/* 심각도 */}
                        <span>
                          <Badge variant={c.severity as "critical" | "major" | "minor"}>
                            {t(`severities.${c.severity}` as Parameters<typeof t>[0])}
                          </Badge>
                        </span>

                        {/* 상태 */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {t(`statuses.${c.status}` as Parameters<typeof t>[0])}
                        </span>

                        {/* SLA / 최종보고기한 */}
                        <span>
                          {isClosed ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> 완료
                            </span>
                          ) : overdueFinal ? (
                            <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                              <Clock className="h-3.5 w-3.5" /> {tCommon("overdue")}
                            </span>
                          ) : days !== null ? (
                            <span className={`text-xs ${days <= 3 ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
                              {formatDate(c.finalReportDueAt!)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </span>
                      </div>

                      {/* 2행: 발생단계 | 품번 | 접수채널 | CAPA | 접수일 */}
                      <div className="grid grid-cols-[7rem_1fr] gap-x-3 mt-1">
                        {/* 번호 열 아래 빈 공간 맞춤 */}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(c.receivedAt)}
                        </span>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* 발생 단계 */}
                          <span className={`text-xs font-medium ${STAGE_COLORS[c.discoveryStage] ?? "text-gray-500"}`}>
                            {t(`stages.${c.discoveryStage}` as Parameters<typeof t>[0])}
                          </span>

                          {/* 품번 */}
                          {c.partNumber && (
                            <span className="text-xs text-muted-foreground">
                              {c.partNumber}{c.partName ? ` · ${c.partName}` : ""}
                            </span>
                          )}

                          {/* 접수 채널 */}
                          {c.receivedChannel && (
                            <span className="text-xs text-muted-foreground">
                              {CHANNEL_LABELS[c.receivedChannel] ?? c.receivedChannel}
                            </span>
                          )}

                          {/* CAPA 연결 */}
                          {c.capaId ? (
                            <span className="text-xs text-blue-600 font-medium">CAPA 연결</span>
                          ) : (
                            <span className="text-xs text-gray-400">CAPA 미연결</span>
                          )}

                          {/* 분석결과 */}
                          {c.resolutionType && RESOLUTION_LABELS[c.resolutionType] && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${RESOLUTION_LABELS[c.resolutionType].className}`}>
                              {RESOLUTION_LABELS[c.resolutionType].label}
                            </span>
                          )}

                          {/* 분석보고서 상태 */}
                          {c.analysisStatus && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${c.analysisStatus === "final" ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"}`}>
                              분석 {c.analysisStatus === "final" ? "확정" : "초안"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3행: 분석 내용 요약 */}
                      {analysisSnippet(c.analysisSections) && (
                        <div className="grid grid-cols-[7rem_1fr] gap-x-3 mt-1">
                          <span />
                          <p className="text-xs text-muted-foreground truncate" title={analysisSnippet(c.analysisSections)!}>
                            {analysisSnippet(c.analysisSections)}
                          </p>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
