"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus, ClipboardCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { PeriodFilter } from "@/components/nc/period-filter";

interface CAPAItem {
  id: string;
  capaNumber: string;
  title: string;
  sourceType: string;
  sourceId: string;
  methodology: string;
  status: string;
  createdAt: Date;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-orange-50 text-orange-700",
  actions_implemented: "bg-purple-50 text-purple-700",
  effectiveness_monitoring: "bg-yellow-50 text-yellow-700",
  closed: "bg-green-50 text-green-700",
};

export function CAPAList({
  items,
  year,
  period,
}: {
  items: CAPAItem[];
  year: number;
  period: string;
}) {
  const t = useTranslations("capa");
  const tCommon = useTranslations("common");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          {t("title")}
        </h1>
        <div className="flex items-center gap-2">
          <a href={`/api/nc/export/capa?year=${year}&period=${period}`} download>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </a>
          <Link href="/capa/new">
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
            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>{t("emptyState")}</p>
            <Link href="/capa/new">
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("capaNumber")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{tCommon("title")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("sourceType")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("methodology")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("status")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("registeredAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/capa/${item.id}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        {item.capaNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/capa/${item.id}`} className="hover:underline font-medium">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t(`sourceTypes.${item.sourceType}` as Parameters<typeof t>[0]) ?? item.sourceType}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                        {t(`methodologies.${item.methodology}` as Parameters<typeof t>[0]) ?? item.methodology}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {t(`statuses.${item.status}` as Parameters<typeof t>[0]) ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
