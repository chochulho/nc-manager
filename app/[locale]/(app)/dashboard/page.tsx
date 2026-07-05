import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalNCs, customerComplaints, capas } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MessageSquareWarning, CheckCircle2, ClipboardCheck } from "lucide-react";
import { PeriodFilter } from "@/components/nc/period-filter";
import { PrintButton } from "@/components/nc/print-button";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";
import { getTranslations } from "next-intl/server";

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const [session, t, tNc, tCc, tc, tPeriod] = await Promise.all([
    auth(),
    getTranslations("dashboard"),
    getTranslations("nc"),
    getTranslations("complaint"),
    getTranslations("common"),
    getTranslations("periodFilter"),
  ]);

  const orgId = session?.user?.organizationId;
  const selectedSiteId = await getSelectedSiteId();

  const sp = await searchParams;
  const { year, period } = parsePeriodParams(sp.year, sp.period);
  const range = periodToDateRange(year, period);
  function getPeriodLabel(): string {
    if (year === 0) return tPeriod("labelAll");
    if (period === "all") return tPeriod("labelYear", { year });
    const key = `labelYear${period}` as Parameters<typeof tPeriod>[0];
    return tPeriod(key, { year });
  }
  const label = getPeriodLabel();

  const ncConditions = orgId ? [eq(internalNCs.orgId, orgId)] : null;
  const ccConditions = orgId ? [eq(customerComplaints.orgId, orgId)] : null;
  const capaConditions = orgId ? [eq(capas.orgId, orgId)] : null;

  if (orgId && session?.user) {
    const ncSiteFilter = buildSiteFilter(session.user.allowedSiteIds, internalNCs.occurrenceSiteId, selectedSiteId);
    if (ncSiteFilter && ncConditions) ncConditions.push(ncSiteFilter);
    const ccSiteFilter = buildSiteFilter(session.user.allowedSiteIds, customerComplaints.siteId, selectedSiteId);
    if (ccSiteFilter && ccConditions) ccConditions.push(ccSiteFilter);
    const capaSiteFilter = buildSiteFilter(session.user.allowedSiteIds, capas.siteId, selectedSiteId);
    if (capaSiteFilter && capaConditions) capaConditions.push(capaSiteFilter);
  }

  if (range && ncConditions) {
    ncConditions.push(gte(internalNCs.discoveredAt, range.gte));
    ncConditions.push(lte(internalNCs.discoveredAt, range.lte));
  }
  if (range && ccConditions) {
    ccConditions.push(gte(customerComplaints.receivedAt, range.gte));
    ccConditions.push(lte(customerComplaints.receivedAt, range.lte));
  }
  if (range && capaConditions) {
    capaConditions.push(gte(capas.createdAt, range.gte));
    capaConditions.push(lte(capas.createdAt, range.lte));
  }

  const [ncItems, ccItems, capaItems] = await Promise.all([
    ncConditions
      ? db
          .select({ severity: internalNCs.severity, status: internalNCs.status })
          .from(internalNCs)
          .where(and(...ncConditions))
      : Promise.resolve([]),
    ccConditions
      ? db
          .select({ severity: customerComplaints.severity, status: customerComplaints.status })
          .from(customerComplaints)
          .where(and(...ccConditions))
      : Promise.resolve([]),
    capaConditions
      ? db
          .select({ status: capas.status })
          .from(capas)
          .where(and(...capaConditions))
      : Promise.resolve([]),
  ]);

  const ncTotal = ncItems.length;
  const ccTotal = ccItems.length;
  const ncOpen = ncItems.filter((n) => n.status !== "closed").length;
  const ccOpen = ccItems.filter((c) => !["closed", "closed_ntf"].includes(c.status)).length;
  const ncClosed = ncTotal - ncOpen;
  const ccClosed = ccTotal - ccOpen;
  const totalClosed = ncClosed + ccClosed;

  const ncBySeverity = countBy(ncItems, (n) => n.severity);
  const ncByStatus = countBy(ncItems, (n) => n.status);
  const ccBySeverity = countBy(ccItems, (c) => c.severity);
  const ccByStatus = countBy(ccItems, (c) => c.status);

  const capaOpen = capaItems.filter((c) => c.status !== "closed").length;

  const kpis = [
    { label: t("kpi.ncTotal"), value: ncTotal, icon: AlertTriangle, color: "text-orange-600" },
    { label: t("kpi.ccTotal"), value: ccTotal, icon: MessageSquareWarning, color: "text-red-600" },
    { label: t("kpi.capaOpen"), value: capaOpen, icon: ClipboardCheck, color: "text-blue-600" },
    { label: t("kpi.closed"), value: totalClosed, icon: CheckCircle2, color: "text-green-600" },
  ];

  const severityKeys = ["critical", "major", "minor"] as const;
  const ncStatusKeys = ["open", "contained", "disposition_decided", "capa_in_progress", "closed"] as const;
  const ccStatusKeys = ["received", "acknowledged", "contained", "investigating", "8d_in_progress", "final_reported", "closed", "closed_ntf"] as const;

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          {session?.user?.organizationName && (
            <span className="text-sm text-muted-foreground">{session.user.organizationName}</span>
          )}
        </div>
        <PrintButton />
      </div>

      {/* Period Filter */}
      <div className="mb-6">
        <Suspense fallback={<div className="h-12" />}>
          <PeriodFilter year={year} period={period} />
        </Suspense>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{t("reportTitle")}</h1>
        <p className="text-gray-600 mt-1">
          {session?.user?.organizationName} &nbsp;·&nbsp; {label} &nbsp;·&nbsp; {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label: l, value, icon: Icon, color }) => (
          <Card key={l}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{l}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown Tables */}
      {(ncTotal > 0 || ccTotal > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NC Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t("ncAnalysis")}
            </h2>

            <p className="text-xs font-medium text-muted-foreground mb-2">{t("bySeverity")}</p>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs text-gray-500">{t("colSeverity")}</th>
                  <th className="text-right py-1.5 text-xs text-gray-500">{t("colCount")}</th>
                  <th className="text-right py-1.5 text-xs text-gray-500">{t("colRatio")}</th>
                </tr>
              </thead>
              <tbody>
                {severityKeys.map((s) => {
                  const cnt = ncBySeverity[s] ?? 0;
                  const pct = ncTotal > 0 ? Math.round((cnt / ncTotal) * 100) : 0;
                  return (
                    <tr key={s} className="border-b last:border-0">
                      <td className="py-1.5 text-xs">{tNc(`severities.${s}`)}</td>
                      <td className="py-1.5 text-right font-semibold">{cnt}</td>
                      <td className="py-1.5 text-right text-muted-foreground text-xs">{pct}%</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="py-1.5 text-xs">{tc("total")}</td>
                  <td className="py-1.5 text-right">{ncTotal}</td>
                  <td className="py-1.5 text-right text-muted-foreground text-xs">100%</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs font-medium text-muted-foreground mb-2">{t("byStatus")}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs text-gray-500">{t("colStatus")}</th>
                  <th className="text-right py-1.5 text-xs text-gray-500">{t("colCount")}</th>
                </tr>
              </thead>
              <tbody>
                {ncStatusKeys.map((s) => {
                  const cnt = ncByStatus[s] ?? 0;
                  if (cnt === 0) return null;
                  return (
                    <tr key={s} className="border-b last:border-0">
                      <td className="py-1.5 text-xs">{tNc(`statuses.${s}`)}</td>
                      <td className="py-1.5 text-right font-semibold">{cnt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Complaint Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-red-500" />
              {t("ccAnalysis")}
            </h2>

            <p className="text-xs font-medium text-muted-foreground mb-2">{t("bySeverity")}</p>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs text-gray-500">{t("colSeverity")}</th>
                  <th className="text-right py-1.5 text-xs text-gray-500">{t("colCount")}</th>
                  <th className="text-right py-1.5 text-xs text-gray-500">{t("colRatio")}</th>
                </tr>
              </thead>
              <tbody>
                {severityKeys.map((s) => {
                  const cnt = ccBySeverity[s] ?? 0;
                  const pct = ccTotal > 0 ? Math.round((cnt / ccTotal) * 100) : 0;
                  return (
                    <tr key={s} className="border-b last:border-0">
                      <td className="py-1.5 text-xs">{tCc(`severities.${s}` as Parameters<typeof tCc>[0])}</td>
                      <td className="py-1.5 text-right font-semibold">{cnt}</td>
                      <td className="py-1.5 text-right text-muted-foreground text-xs">{pct}%</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="py-1.5 text-xs">{tc("total")}</td>
                  <td className="py-1.5 text-right">{ccTotal}</td>
                  <td className="py-1.5 text-right text-muted-foreground text-xs">100%</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs font-medium text-muted-foreground mb-2">{t("byStatus")}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs text-gray-500">{t("colStatus")}</th>
                  <th className="text-right py-1.5 text-xs text-gray-500">{t("colCount")}</th>
                </tr>
              </thead>
              <tbody>
                {ccStatusKeys.map((s) => {
                  const cnt = ccByStatus[s] ?? 0;
                  if (cnt === 0) return null;
                  return (
                    <tr key={s} className="border-b last:border-0">
                      <td className="py-1.5 text-xs">{tCc(`statuses.${s}` as Parameters<typeof tCc>[0])}</td>
                      <td className="py-1.5 text-right font-semibold">{cnt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ncTotal === 0 && ccTotal === 0 && (
        <div className="text-sm text-muted-foreground text-center py-12">
          {label}
        </div>
      )}
    </div>
  );
}
