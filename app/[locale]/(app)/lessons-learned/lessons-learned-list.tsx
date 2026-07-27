"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Plus, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LLItem {
  id: string;
  llNumber: string;
  title: string;
  keyLearning: string | null;
  tags: string[] | null;
  status: string;
  createdAt: Date;
  sourceInternalNcId: string | null;
  sourcePartNcId: string | null;
  sourceComplaintId: string | null;
  ncNumber: string | null;
  pncNumber: string | null;
  complaintNumber: string | null;
}

export function LessonsLearnedList({ items }: { items: LLItem[] }) {
  const t = useTranslations("ll");
  const tc = useTranslations("common");

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft:     { label: t("statuses.draft"),     cls: "bg-gray-100 text-gray-600" },
    review:    { label: t("statuses.review"),    cls: "bg-yellow-50 text-yellow-700" },
    published: { label: t("statuses.published"), cls: "bg-green-50 text-green-700" },
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Lightbulb className="h-6 w-6" style={{ color: "#F26B3A" }} />
          {t("title")}
        </h1>
        <Link href="/lessons-learned/new">
          <Button style={{ background: "#2B4B8C" }} className="hover:opacity-90">
            <Plus className="h-4 w-4 mr-1" />
            {t("new")}
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-20" style={{ color: "#2B4B8C" }} />
          <p className="text-lg font-medium mb-1">{t("emptyState")}</p>
          <p className="text-sm mb-6">{t("emptySubtitle")}</p>
          <Link href="/lessons-learned/new">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              {t("registerFirst")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">{t("llNumber")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tc("title")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">{t("source")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("keyLearningSummary")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">{tc("status")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">{tc("registeredAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const st = statusConfig[item.status] ?? statusConfig.draft;
                const sources: string[] = [];
                if (item.ncNumber) sources.push(item.ncNumber);
                if (item.pncNumber) sources.push(item.pncNumber);
                if (item.complaintNumber) sources.push(item.complaintNumber);

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/lessons-learned/${item.id}`}
                        className="font-mono text-sm font-semibold hover:underline"
                        style={{ color: "#2B4B8C" }}
                      >
                        {item.llNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/lessons-learned/${item.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {item.title}
                      </Link>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{item.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sources.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {item.ncNumber && (
                            <Link
                              href={`/internal-nc/${item.sourceInternalNcId}`}
                              className="text-xs hover:underline"
                              style={{ color: "#F26B3A" }}
                            >
                              {item.ncNumber}
                            </Link>
                          )}
                          {item.pncNumber && (
                            <Link
                              href={`/part-nc/${item.sourcePartNcId}`}
                              className="text-xs hover:underline"
                              style={{ color: "#F26B3A" }}
                            >
                              {item.pncNumber}
                            </Link>
                          )}
                          {item.complaintNumber && (
                            <Link
                              href={`/complaints/${item.sourceComplaintId}`}
                              className="text-xs hover:underline"
                              style={{ color: "#2B4B8C" }}
                            >
                              {item.complaintNumber}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {item.keyLearning ? (
                        <p className="text-xs text-gray-700 line-clamp-2">{item.keyLearning}</p>
                      ) : (
                        <span className="text-xs text-gray-400 italic">{t("notWritten")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", st.cls)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
