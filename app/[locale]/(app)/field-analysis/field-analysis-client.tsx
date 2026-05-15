"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { MapPin, Car, Gauge, Calendar, AlertCircle, Radio, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { periodLabel } from "@/lib/period-utils";

const PERIODS = ["all", "H1", "H2", "Q1", "Q2", "Q3", "Q4"] as const;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [0, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  major: "#f97316",
  minor: "#22c55e",
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f43f5e", "#84cc16"];

interface AnalysisData {
  summary: {
    total: number;
    avgMileage: number | null;
    avgUsageMonths: number | null;
    withDtc: number;
  };
  vehicleModelCounts: { model: string; count: number }[];
  regionCounts: { region: string; count: number }[];
  dtcFrequency: { code: string; count: number }[];
  mileageDistribution: { bucket: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  severityDistribution: { severity: string; count: number }[];
  recentClaims: {
    complaintId: string;
    complaintNumber: string;
    title: string;
    receivedAt: string;
    status: string;
    severity: string;
    vehicleModel: string | null;
    region: string | null;
    mileageKm: number | null;
    customerName: string | null;
    partName: string | null;
  }[];
}

const STATUS_LABELS: Record<string, string> = {
  received: "접수",
  acknowledged: "확인",
  contained: "봉쇄",
  investigating: "조사 중",
  "8d_in_progress": "8D 진행",
  final_reported: "최종 보고",
  closed: "종결",
  closed_ntf: "종결(NTF)",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "치명",
  major: "주요",
  minor: "경미",
};

export function FieldAnalysisClient({ year, period }: { year: number; period: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  const updateParams = useCallback((y: number, p: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (y === 0) { params.delete("year"); params.delete("period"); }
    else { params.set("year", String(y)); params.set("period", p); }
    router.replace(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (year !== 0) { params.set("year", String(year)); params.set("period", period); }
    fetch(`/api/nc/field-analysis?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, period]);

  const label = periodLabel(year, period);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            필드 클레임 분석
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="border rounded-lg text-sm px-3 py-1.5 bg-white"
            value={year}
            onChange={(e) => updateParams(Number(e.target.value), period)}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y === 0 ? "전체 기간" : `${y}년`}</option>
            ))}
          </select>
          {year !== 0 && (
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => updateParams(year, p)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md font-medium border transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  )}
                >
                  {p === "all" ? "연간" : p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          데이터 로딩 중...
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          데이터를 불러올 수 없습니다.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<AlertCircle className="h-4 w-4 text-emerald-600" />}
              label="총 필드 클레임"
              value={data.summary.total.toString()}
              unit="건"
            />
            <KpiCard
              icon={<Gauge className="h-4 w-4 text-blue-600" />}
              label="평균 주행거리"
              value={data.summary.avgMileage !== null ? data.summary.avgMileage.toLocaleString() : "-"}
              unit="km"
            />
            <KpiCard
              icon={<Calendar className="h-4 w-4 text-orange-500" />}
              label="평균 사용기간"
              value={data.summary.avgUsageMonths !== null ? data.summary.avgUsageMonths.toString() : "-"}
              unit="개월"
            />
            <KpiCard
              icon={<Radio className="h-4 w-4 text-purple-600" />}
              label="DTC 코드 있음"
              value={data.summary.withDtc.toString()}
              unit={`건 (${data.summary.total > 0 ? Math.round(data.summary.withDtc / data.summary.total * 100) : 0}%)`}
            />
          </div>

          {data.summary.total === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-muted-foreground text-sm">
              해당 기간에 필드 클레임 데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* Charts Row 1: 차종별 + 지역별 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="차종별 발생 현황" icon={<Car className="h-4 w-4 text-blue-600" />}>
                  {data.vehicleModelCounts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.vehicleModelCounts} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="model" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip formatter={(v) => [`${v}건`, "클레임 수"]} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                <ChartCard title="지역별 발생 현황" icon={<MapPin className="h-4 w-4 text-emerald-600" />}>
                  {data.regionCounts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.regionCounts} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="region" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip formatter={(v) => [`${v}건`, "클레임 수"]} />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>
              </div>

              {/* Charts Row 2: DTC 빈도 + 주행거리 분포 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="DTC 코드 빈도 (Top 15)" icon={<Radio className="h-4 w-4 text-purple-600" />}>
                  {data.dtcFrequency.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.dtcFrequency} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fontFamily: "monospace" }} width={80} />
                        <Tooltip formatter={(v) => [`${v}건`, "발생 횟수"]} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                      DTC 코드 데이터 없음
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="주행거리 분포" icon={<Gauge className="h-4 w-4 text-orange-500" />}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.mileageDistribution} margin={{ left: 4, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [`${v}건`, "클레임 수"]} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Charts Row 3: 월별 추이 + 심각도 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ChartCard title="월별 발생 추이" icon={<TrendingUp className="h-4 w-4 text-blue-600" />}>
                    {data.monthlyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={data.monthlyTrend} margin={{ left: 4, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip formatter={(v) => [`${v}건`, "클레임 수"]} />
                          <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </ChartCard>
                </div>

                <ChartCard title="심각도 분포">
                  {data.severityDistribution.length > 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={data.severityDistribution}
                            dataKey="count"
                            nameKey="severity"
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            label={({ name, percent }: { name?: string; percent?: number }) => `${name ? (SEVERITY_LABELS[name] ?? name) : ""} ${Math.round((percent ?? 0) * 100)}%`}
                            labelLine={false}
                            fontSize={11}
                          >
                            {data.severityDistribution.map((entry) => (
                              <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] ?? CHART_COLORS[0]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, name) => [`${v}건`, SEVERITY_LABELS[name as string] ?? name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyChart />}
                </ChartCard>
              </div>

              {/* Recent Claims Table */}
              {data.recentClaims.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b">
                    <h3 className="font-semibold text-sm">최근 필드 클레임 목록</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium">번호</th>
                          <th className="text-left px-4 py-2.5 font-medium">제목</th>
                          <th className="text-left px-4 py-2.5 font-medium">고객사</th>
                          <th className="text-left px-4 py-2.5 font-medium">차종</th>
                          <th className="text-left px-4 py-2.5 font-medium">지역</th>
                          <th className="text-right px-4 py-2.5 font-medium">주행거리</th>
                          <th className="text-left px-4 py-2.5 font-medium">심각도</th>
                          <th className="text-left px-4 py-2.5 font-medium">상태</th>
                          <th className="text-left px-4 py-2.5 font-medium">접수일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recentClaims.map((c) => (
                          <tr key={c.complaintId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5">
                              <Link href={`/complaints/${c.complaintId}`} className="text-primary font-mono text-xs hover:underline">
                                {c.complaintNumber}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 max-w-[200px] truncate">{c.title}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{c.customerName ?? "-"}</td>
                            <td className="px-4 py-2.5">{c.vehicleModel ?? "-"}</td>
                            <td className="px-4 py-2.5">{c.region ?? "-"}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs">
                              {c.mileageKm !== null ? `${c.mileageKm.toLocaleString()} km` : "-"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                                c.severity === "critical" && "bg-red-100 text-red-700",
                                c.severity === "major" && "bg-orange-100 text-orange-700",
                                c.severity === "minor" && "bg-green-100 text-green-700",
                              )}>
                                {SEVERITY_LABELS[c.severity] ?? c.severity}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">
                              {STATUS_LABELS[c.status] ?? c.status}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">
                              {c.receivedAt ? new Date(c.receivedAt).toLocaleDateString("ko-KR") : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
      데이터 없음
    </div>
  );
}
