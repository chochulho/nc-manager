"use client";

import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

const CURRENT_YEAR = new Date().getFullYear();

const YEARS = [
  { value: 0, label: "전체" },
  { value: CURRENT_YEAR - 1, label: String(CURRENT_YEAR - 1) },
  { value: CURRENT_YEAR, label: String(CURRENT_YEAR) },
  { value: CURRENT_YEAR + 1, label: String(CURRENT_YEAR + 1) },
];

const PERIODS = [
  { value: "all", label: "전체" },
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
  { value: "H1", label: "상반기" },
  { value: "H2", label: "하반기" },
];

export function PeriodFilter({ year, period }: { year: number; period: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) params.set(k, v);
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

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 print:hidden">
      <span className="text-xs font-medium text-muted-foreground">년도</span>
      {YEARS.map((y) => (
        <button
          key={y.value}
          onClick={() =>
            update({ year: String(y.value), ...(y.value === 0 ? { period: "all" } : {}) })
          }
          className={btnClass(year === y.value)}
        >
          {y.label}
        </button>
      ))}
      {year !== 0 && (
        <>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <span className="text-xs font-medium text-muted-foreground">기간</span>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => update({ period: p.value })}
              className={btnClass(period === p.value)}
            >
              {p.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
