"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_VALUES = [0, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const PERIOD_VALUES = ["all", "Q1", "Q2", "Q3", "Q4", "H1", "H2"] as const;

export function PeriodFilter({ year, period }: { year: number; period: string }) {
  const t = useTranslations("periodFilter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) params.set(k, v);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const btnClass = (active: boolean) =>
    `px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
      active
        ? "bg-primary text-white shadow-sm"
        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
    }`;

  function periodLabel(p: (typeof PERIOD_VALUES)[number]) {
    if (p === "H1") return t("H1");
    if (p === "H2") return t("H2");
    if (p === "all") return t("all");
    return p;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 print:hidden">
      <span className="text-xs font-medium text-muted-foreground">{t("year")}</span>
      {YEAR_VALUES.map((y) => (
        <button
          key={y}
          onClick={() =>
            update({ year: String(y), ...(y === 0 ? { period: "all" } : {}) })
          }
          className={btnClass(year === y)}
        >
          {y === 0 ? t("allYears") : String(y)}
        </button>
      ))}
      {year !== 0 && (
        <>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <span className="text-xs font-medium text-muted-foreground">{t("period")}</span>
          {PERIOD_VALUES.map((p) => (
            <button
              key={p}
              onClick={() => update({ period: p })}
              className={btnClass(period === p)}
            >
              {periodLabel(p)}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
