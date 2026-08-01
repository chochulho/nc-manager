"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus, PackageX, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PeriodFilter } from "@/components/nc/period-filter";
import { Pagination } from "@/components/nc/pagination";

interface PNCItem {
  id: string;
  pncNumber: string;
  title: string;
  discoveredAt: Date;
  discoveryStage: string;
  severity: string;
  status: string;
  safetyRelated: boolean;
  partName: string | null;
  partNumber: string | null;
  supplierName: string | null;
  categoryCode: string | null;
}

const severityVariant: Record<string, "critical" | "major" | "minor"> = {
  critical: "critical",
  major: "major",
  minor: "minor",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  contained: "bg-yellow-50 text-yellow-700",
  disposition_decided: "bg-purple-50 text-purple-700",
  capa_in_progress: "bg-orange-50 text-orange-700",
  closed: "bg-green-50 text-green-700",
};

export function PartNCList({
  items,
  year,
  period,
  page,
  totalPages,
  totalCount,
}: {
  items: PNCItem[];
  year: number;
  period: string;
  page: number;
  totalPages: number;
  totalCount: number;
}) {
  const t = useTranslations("partNc");
  const tCommon = useTranslations("common");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <PackageX className="h-6 w-6 text-purple-600" />
          {t("title")}
        </h1>
        <div className="flex items-center gap-2">
          <a href={`/api/nc/export/part-nc?year=${year}&period=${period}`} download>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </a>
          <Link href="/part-nc/new">
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
            <PackageX className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>{t("emptyState")}</p>
            <Link href="/part-nc/new">
              <Button variant="outline" className="mt-4">{t("registerFirst")}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b text-xs text-muted-foreground">
              <span className="font-semibold text-gray-700">{tCommon("totalCount", { count: totalCount })}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("ncNumber")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{tCommon("title")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("part")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("supplier")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("discoveryStage")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("severity")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("status")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("discoveredAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((pnc) => (
                  <tr key={pnc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/part-nc/${pnc.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {pnc.pncNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {pnc.safetyRelated && (
                          <span className="text-red-600 text-xs font-bold">S</span>
                        )}
                        <Link href={`/part-nc/${pnc.id}`} className="hover:underline font-medium">
                          {pnc.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {pnc.partName ? (
                        <div className="text-xs">
                          <div className="text-gray-700">{pnc.partName}</div>
                          {pnc.partNumber && <div className="text-muted-foreground font-mono">{pnc.partNumber}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {pnc.supplierName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {(t as any)(`stages.${pnc.discoveryStage}`) ?? pnc.discoveryStage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={severityVariant[pnc.severity] ?? "secondary"}>
                        {(t as any)(`severities.${pnc.severity}`) ?? pnc.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[pnc.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {(t as any)(`statuses.${pnc.status}`) ?? pnc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(pnc.discoveredAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}
