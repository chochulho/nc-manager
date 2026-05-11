"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, MessageSquareWarning, AlertCircle, Clock } from "lucide-react";
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
  customerName: string | null;
  partName: string | null;
}

const statusColors: Record<string, string> = {
  received: "bg-blue-50 text-blue-700",
  acknowledged: "bg-indigo-50 text-indigo-700",
  contained: "bg-yellow-50 text-yellow-700",
  investigating: "bg-orange-50 text-orange-700",
  "8d_in_progress": "bg-purple-50 text-purple-700",
  final_reported: "bg-teal-50 text-teal-700",
  closed: "bg-green-50 text-green-700",
  closed_ntf: "bg-gray-100 text-gray-600",
};

function isSlaOverdue(due: Date | null): boolean {
  if (!due) return false;
  return new Date() > due;
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
        <Link href="/complaints/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            {t("new")}
          </Button>
        </Link>
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
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{tCommon("number")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{tCommon("title")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("customer")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("severity")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("status")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("sla")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("receivedAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((c) => {
                  const overdue =
                    isSlaOverdue(c.finalReportDueAt) &&
                    !["closed", "closed_ntf"].includes(c.status);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-gray-50 transition-colors ${overdue ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/complaints/${c.id}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {c.complaintNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {c.safetyRelated && (
                            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          )}
                          {c.recallRisk && (
                            <span className="text-xs font-bold text-red-700 bg-red-100 px-1 rounded">{tCommon("recall")}</span>
                          )}
                          <Link href={`/complaints/${c.id}`} className="hover:underline font-medium">
                            {c.title}
                          </Link>
                          {c.partName && (
                            <span className="text-xs text-muted-foreground">— {c.partName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {c.customerName ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.severity as any}>
                          {t(`severities.${c.severity}` as Parameters<typeof t>[0]) ?? c.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[c.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {t(`statuses.${c.status}` as Parameters<typeof t>[0]) ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {overdue ? (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                            <Clock className="h-3.5 w-3.5" /> {tCommon("overdue")}
                          </span>
                        ) : c.finalReportDueAt ? (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(c.finalReportDueAt)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(c.receivedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
