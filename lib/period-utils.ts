export interface DateRange {
  gte: Date;
  lte: Date;
}

export function periodToDateRange(year: number, period: string): DateRange | null {
  if (year === 0) return null;

  const monthRanges: Record<string, [number, number]> = {
    all: [0, 11],
    Q1: [0, 2],
    Q2: [3, 5],
    Q3: [6, 8],
    Q4: [9, 11],
    H1: [0, 5],
    H2: [6, 11],
  };

  const [start, end] = monthRanges[period] ?? [0, 11];
  return {
    gte: new Date(year, start, 1),
    lte: new Date(year, end + 1, 0, 23, 59, 59, 999),
  };
}

export function parsePeriodParams(
  yearStr: string | undefined,
  periodStr: string | undefined
): { year: number; period: string } {
  const currentYear = new Date().getFullYear();
  const year = yearStr !== undefined ? (parseInt(yearStr) || 0) : currentYear;
  const period = periodStr ?? "all";
  return { year, period };
}

export function periodLabel(year: number, period: string): string {
  if (year === 0) return "전체 기간";
  const labels: Record<string, string> = {
    all: `${year}년 전체`,
    Q1: `${year}년 Q1 (1~3월)`,
    Q2: `${year}년 Q2 (4~6월)`,
    Q3: `${year}년 Q3 (7~9월)`,
    Q4: `${year}년 Q4 (10~12월)`,
    H1: `${year}년 상반기 (1~6월)`,
    H2: `${year}년 하반기 (7~12월)`,
  };
  return labels[period] ?? `${year}년`;
}
