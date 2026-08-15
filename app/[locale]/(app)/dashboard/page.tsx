import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalNCs, partNCs, customerComplaints, capas } from "@/lib/db/schema";
import { eq, and, gte, lte, or, ne, notInArray, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, PackageX, MessageSquareWarning, CheckCircle2, ClipboardCheck } from "lucide-react";
import { PeriodFilter } from "@/components/nc/period-filter";
import { PrintButton } from "@/components/nc/print-button";
import { Link } from "@/lib/i18n/navigation";
import { parsePeriodParams, periodToDateRange } from "@/lib/period-utils";
import { buildSiteFilter, getSelectedSiteId } from "@/lib/site-filter";
import { getTranslations, getLocale } from "next-intl/server";

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

function extractCapaText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return (val as Array<Record<string, unknown>>)
      .map((row) => Object.values(row).filter(Boolean).join(" | "))
      .join("\n");
  }
  return "";
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  major: "bg-orange-100 text-orange-800",
  minor: "bg-yellow-100 text-yellow-800",
};
const SEVERITY_BAR: Record<string, string> = {
  critical: "bg-red-500",
  major: "bg-orange-500",
  minor: "bg-amber-400",
};

function SeverityBars({
  counts, total, labelFor,
}: {
  counts: Record<string, number>;
  total: number;
  labelFor: (key: "critical" | "major" | "minor") => string;
}) {
  return (
    <div className="space-y-1.5">
      {(["critical", "major", "minor"] as const).map((key) => {
        const cnt = counts[key] ?? 0;
        const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-xs text-muted-foreground">{labelFor(key)}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${SEVERITY_BAR[key]}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-semibold">{cnt}</span>
          </div>
        );
      })}
    </div>
  );
}

interface ReportCase {
  id: string;
  number: string;
  title: string;
  date: Date;
  dateLabel: string;
  severityLabel: string;
  severityColorClass: string;
  statusLabel: string;
  rootCause: string;
  action: string;
  href: string;
}

function CaseListTable({
  cases, headers, emptyLabel,
}: {
  cases: ReportCase[];
  headers: { number: string; title: string; date: string; severity: string; progress: string; rootCause: string; action: string };
  emptyLabel: string;
}) {
  if (cases.length === 0) {
    return <p className="text-xs text-muted-foreground py-3">{emptyLabel}</p>;
  }
  return (
    <>
      <table className="w-full text-xs table-fixed">
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "24.5%" }} />
          <col style={{ width: "24.5%" }} />
        </colgroup>
        <thead>
          <tr className="border-b">
            <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">{headers.number}</th>
            <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">{headers.title}</th>
            <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">{headers.date}</th>
            <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">{headers.severity}</th>
            <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">{headers.progress}</th>
            <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">{headers.rootCause}</th>
            <th className="text-left py-1.5 text-gray-500 font-medium">{headers.action}</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-b last:border-0 align-top">
              <td className="py-2 pr-2 font-mono text-muted-foreground whitespace-nowrap">{c.number}</td>
              <td className="py-2 pr-2">
                <Link href={c.href} className="font-medium hover:underline">{c.title}</Link>
              </td>
              <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">{c.dateLabel}</td>
              <td className="py-2 pr-2">
                <span className={`inline-block px-1.5 py-0.5 rounded-full font-medium ${c.severityColorClass}`}>{c.severityLabel}</span>
              </td>
              <td className="py-2 pr-2">{c.statusLabel}</td>
              <td className="py-2 pr-2 whitespace-pre-wrap">{c.rootCause}</td>
              <td className="py-2 whitespace-pre-wrap">{c.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const [session, t, tNc, tPnc, tCc, tCapa, tc, tPeriod, locale] = await Promise.all([
    auth(),
    getTranslations("dashboard"),
    getTranslations("nc"),
    getTranslations("partNc"),
    getTranslations("complaint"),
    getTranslations("capa"),
    getTranslations("common"),
    getTranslations("periodFilter"),
    getLocale(),
  ]);
  const printedAt = new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { timeZone: "Asia/Seoul" });

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
  const pncConditions = orgId ? [eq(partNCs.orgId, orgId)] : null;
  const ccConditions = orgId ? [eq(customerComplaints.orgId, orgId)] : null;
  const capaConditions = orgId ? [eq(capas.orgId, orgId)] : null;

  if (orgId && session?.user) {
    const ncSiteFilter = buildSiteFilter(session.user.allowedSiteIds, internalNCs.occurrenceSiteId, selectedSiteId);
    if (ncSiteFilter && ncConditions) ncConditions.push(ncSiteFilter);
    const pncSiteFilter = buildSiteFilter(session.user.allowedSiteIds, partNCs.occurrenceSiteId, selectedSiteId);
    if (pncSiteFilter && pncConditions) pncConditions.push(pncSiteFilter);
    const ccSiteFilter = buildSiteFilter(session.user.allowedSiteIds, customerComplaints.siteId, selectedSiteId);
    if (ccSiteFilter && ccConditions) ccConditions.push(ccSiteFilter);
    const capaSiteFilter = buildSiteFilter(session.user.allowedSiteIds, capas.siteId, selectedSiteId);
    if (capaSiteFilter && capaConditions) capaConditions.push(capaSiteFilter);
  }

  if (range && ncConditions) {
    ncConditions.push(gte(internalNCs.discoveredAt, range.gte));
    ncConditions.push(lte(internalNCs.discoveredAt, range.lte));
  }
  if (range && pncConditions) {
    pncConditions.push(gte(partNCs.discoveredAt, range.gte));
    pncConditions.push(lte(partNCs.discoveredAt, range.lte));
  }
  if (range && ccConditions) {
    ccConditions.push(gte(customerComplaints.receivedAt, range.gte));
    ccConditions.push(lte(customerComplaints.receivedAt, range.lte));
  }
  if (range && capaConditions) {
    capaConditions.push(gte(capas.createdAt, range.gte));
    capaConditions.push(lte(capas.createdAt, range.lte));
  }

  // ── Case list: "주요 불량 현황" — always the last 3 months OR still-open, regardless of the period filter above ──
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const ncCaseConditions = orgId ? [eq(internalNCs.orgId, orgId)] : null;
  const pncCaseConditions = orgId ? [eq(partNCs.orgId, orgId)] : null;
  const ccCaseConditions = orgId ? [eq(customerComplaints.orgId, orgId)] : null;

  if (orgId && session?.user) {
    const ncSiteFilter = buildSiteFilter(session.user.allowedSiteIds, internalNCs.occurrenceSiteId, selectedSiteId);
    if (ncSiteFilter && ncCaseConditions) ncCaseConditions.push(ncSiteFilter);
    const pncSiteFilter = buildSiteFilter(session.user.allowedSiteIds, partNCs.occurrenceSiteId, selectedSiteId);
    if (pncSiteFilter && pncCaseConditions) pncCaseConditions.push(pncSiteFilter);
    const ccSiteFilter = buildSiteFilter(session.user.allowedSiteIds, customerComplaints.siteId, selectedSiteId);
    if (ccSiteFilter && ccCaseConditions) ccCaseConditions.push(ccSiteFilter);
  }

  if (ncCaseConditions) ncCaseConditions.push(or(gte(internalNCs.discoveredAt, threeMonthsAgo), ne(internalNCs.status, "closed"))!);
  if (pncCaseConditions) pncCaseConditions.push(or(gte(partNCs.discoveredAt, threeMonthsAgo), ne(partNCs.status, "closed"))!);
  if (ccCaseConditions) ccCaseConditions.push(or(gte(customerComplaints.receivedAt, threeMonthsAgo), notInArray(customerComplaints.status, ["closed", "closed_ntf"]))!);

  const [ncItems, pncItems, ccItems, capaItems, ncCaseList, pncCaseList, ccCaseList] = await Promise.all([
    ncConditions
      ? db.select({ severity: internalNCs.severity, status: internalNCs.status }).from(internalNCs).where(and(...ncConditions))
      : Promise.resolve([]),
    pncConditions
      ? db.select({ severity: partNCs.severity, status: partNCs.status }).from(partNCs).where(and(...pncConditions))
      : Promise.resolve([]),
    ccConditions
      ? db.select({ severity: customerComplaints.severity, status: customerComplaints.status }).from(customerComplaints).where(and(...ccConditions))
      : Promise.resolve([]),
    capaConditions
      ? db.select({ status: capas.status }).from(capas).where(and(...capaConditions))
      : Promise.resolve([]),
    ncCaseConditions
      ? db.select({
          id: internalNCs.id, ncNumber: internalNCs.ncNumber, title: internalNCs.title,
          discoveredAt: internalNCs.discoveredAt, severity: internalNCs.severity, status: internalNCs.status,
          capaId: internalNCs.capaId, dispositionType: internalNCs.dispositionType, dispositionNotes: internalNCs.dispositionNotes,
        }).from(internalNCs).where(and(...ncCaseConditions))
      : Promise.resolve([]),
    pncCaseConditions
      ? db.select({
          id: partNCs.id, pncNumber: partNCs.pncNumber, title: partNCs.title,
          discoveredAt: partNCs.discoveredAt, severity: partNCs.severity, status: partNCs.status,
          capaId: partNCs.capaId, dispositionType: partNCs.dispositionType, dispositionNotes: partNCs.dispositionNotes,
        }).from(partNCs).where(and(...pncCaseConditions))
      : Promise.resolve([]),
    ccCaseConditions
      ? db.select({
          id: customerComplaints.id, complaintNumber: customerComplaints.complaintNumber, title: customerComplaints.title,
          receivedAt: customerComplaints.receivedAt, severity: customerComplaints.severity, status: customerComplaints.status,
          capaId: customerComplaints.capaId, resolutionType: customerComplaints.resolutionType,
        }).from(customerComplaints).where(and(...ccCaseConditions))
      : Promise.resolve([]),
  ]);

  const capaIds = Array.from(new Set(
    [...ncCaseList, ...pncCaseList, ...ccCaseList].map((c) => c.capaId).filter((id): id is string => !!id)
  ));
  const linkedCapas = capaIds.length > 0
    ? await db.select({ id: capas.id, d4RootCause: capas.d4RootCause, d5PermanentActions: capas.d5PermanentActions, status: capas.status })
        .from(capas).where(inArray(capas.id, capaIds))
    : [];
  const capaMap = Object.fromEntries(linkedCapas.map((c) => [c.id, c]));

  function deriveCause(capaId: string | null, fallbackAction: string): { rootCause: string; action: string; capaStatus: string | null } {
    const c = capaId ? capaMap[capaId] : undefined;
    if (c) {
      return {
        rootCause: extractCapaText(c.d4RootCause) || "-",
        action: extractCapaText(c.d5PermanentActions) || "-",
        capaStatus: c.status,
      };
    }
    return { rootCause: "-", action: fallbackAction || "-", capaStatus: null };
  }

  const fmtDate = (d: Date) => d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { timeZone: "Asia/Seoul" });

  const ncCases: ReportCase[] = ncCaseList.map((item) => {
    const dispositionLabel = item.dispositionType ? tNc(`dispositions.${item.dispositionType}` as Parameters<typeof tNc>[0]) : null;
    const fallbackAction = [dispositionLabel, item.dispositionNotes].filter(Boolean).join(" — ");
    const { rootCause, action, capaStatus } = deriveCause(item.capaId, fallbackAction);
    return {
      id: item.id,
      number: item.ncNumber,
      title: item.title,
      date: item.discoveredAt,
      dateLabel: fmtDate(item.discoveredAt),
      severityLabel: tNc(`severities.${item.severity}` as Parameters<typeof tNc>[0]),
      severityColorClass: SEVERITY_BADGE[item.severity] ?? "",
      statusLabel: tNc(`statuses.${item.status}` as Parameters<typeof tNc>[0])
        + (capaStatus ? ` · CAPA ${tCapa(`statuses.${capaStatus}` as Parameters<typeof tCapa>[0])}` : ""),
      rootCause,
      action,
      href: `/internal-nc/${item.id}`,
    };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  const pncCases: ReportCase[] = pncCaseList.map((item) => {
    const dispositionLabel = item.dispositionType ? tPnc(`dispositions.${item.dispositionType}` as Parameters<typeof tPnc>[0]) : null;
    const fallbackAction = [dispositionLabel, item.dispositionNotes].filter(Boolean).join(" — ");
    const { rootCause, action, capaStatus } = deriveCause(item.capaId, fallbackAction);
    return {
      id: item.id,
      number: item.pncNumber,
      title: item.title,
      date: item.discoveredAt,
      dateLabel: fmtDate(item.discoveredAt),
      severityLabel: tPnc(`severities.${item.severity}` as Parameters<typeof tPnc>[0]),
      severityColorClass: SEVERITY_BADGE[item.severity] ?? "",
      statusLabel: tPnc(`statuses.${item.status}` as Parameters<typeof tPnc>[0])
        + (capaStatus ? ` · CAPA ${tCapa(`statuses.${capaStatus}` as Parameters<typeof tCapa>[0])}` : ""),
      rootCause,
      action,
      href: `/part-nc/${item.id}`,
    };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  const ccCases: ReportCase[] = ccCaseList.map((item) => {
    const fallbackAction = item.resolutionType ? tCc(`resolutionTypes.${item.resolutionType}` as Parameters<typeof tCc>[0]) : "";
    const { rootCause, action, capaStatus } = deriveCause(item.capaId, fallbackAction);
    return {
      id: item.id,
      number: item.complaintNumber,
      title: item.title,
      date: item.receivedAt,
      dateLabel: fmtDate(item.receivedAt),
      severityLabel: tCc(`severities.${item.severity}` as Parameters<typeof tCc>[0]),
      severityColorClass: SEVERITY_BADGE[item.severity] ?? "",
      statusLabel: tCc(`statuses.${item.status}` as Parameters<typeof tCc>[0])
        + (capaStatus ? ` · CAPA ${tCapa(`statuses.${capaStatus}` as Parameters<typeof tCapa>[0])}` : ""),
      rootCause,
      action,
      href: `/complaints/${item.id}`,
    };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  const caseHeaders = {
    number: t("colNumber"), title: tc("title"), date: t("colDate"), severity: t("colSeverity"),
    progress: t("colProgress"), rootCause: t("colRootCause"), action: t("colAction"),
  };

  const ncTotal = ncItems.length;
  const pncTotal = pncItems.length;
  const ccTotal = ccItems.length;
  const ncOpen = ncItems.filter((n) => n.status !== "closed").length;
  const pncOpen = pncItems.filter((p) => p.status !== "closed").length;
  const ccOpen = ccItems.filter((c) => !["closed", "closed_ntf"].includes(c.status)).length;
  const ncClosed = ncTotal - ncOpen;
  const pncClosed = pncTotal - pncOpen;
  const ccClosed = ccTotal - ccOpen;
  const totalClosed = ncClosed + pncClosed + ccClosed;

  const ncBySeverity = countBy(ncItems, (n) => n.severity);
  const ncByStatus = countBy(ncItems, (n) => n.status);
  const pncBySeverity = countBy(pncItems, (p) => p.severity);
  const pncByStatus = countBy(pncItems, (p) => p.status);
  const ccBySeverity = countBy(ccItems, (c) => c.severity);
  const ccByStatus = countBy(ccItems, (c) => c.status);

  const capaOpen = capaItems.filter((c) => c.status !== "closed").length;

  const kpis = [
    { label: t("kpi.ncTotal"), value: ncTotal, icon: AlertTriangle, color: "text-orange-600" },
    { label: t("kpi.pncTotal"), value: pncTotal, icon: PackageX, color: "text-purple-600" },
    { label: t("kpi.ccTotal"), value: ccTotal, icon: MessageSquareWarning, color: "text-red-600" },
    { label: t("kpi.capaOpen"), value: capaOpen, icon: ClipboardCheck, color: "text-blue-600" },
    { label: t("kpi.closed"), value: totalClosed, icon: CheckCircle2, color: "text-green-600" },
  ];

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
          {session?.user?.organizationName} &nbsp;·&nbsp; {label} &nbsp;·&nbsp; {printedAt}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
      {(ncTotal > 0 || pncTotal > 0 || ccTotal > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* NC Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 break-inside-avoid">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t("ncAnalysis")}
            </h2>

            <p className="text-xs font-medium text-muted-foreground mb-2">{t("bySeverity")}</p>
            <SeverityBars counts={ncBySeverity} total={ncTotal} labelFor={(k) => tNc(`severities.${k}`)} />
            <p className="text-xs text-muted-foreground mt-2 mb-4">{tc("totalCount", { count: ncTotal })}</p>

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

          {/* Part NC Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 break-inside-avoid">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PackageX className="h-4 w-4 text-purple-500" />
              {t("pncAnalysis")}
            </h2>

            <p className="text-xs font-medium text-muted-foreground mb-2">{t("bySeverity")}</p>
            <SeverityBars counts={pncBySeverity} total={pncTotal} labelFor={(k) => tPnc(`severities.${k}`)} />
            <p className="text-xs text-muted-foreground mt-2 mb-4">{tc("totalCount", { count: pncTotal })}</p>

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
                  const cnt = pncByStatus[s] ?? 0;
                  if (cnt === 0) return null;
                  return (
                    <tr key={s} className="border-b last:border-0">
                      <td className="py-1.5 text-xs">{tPnc(`statuses.${s}`)}</td>
                      <td className="py-1.5 text-right font-semibold">{cnt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Complaint Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 break-inside-avoid">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-red-500" />
              {t("ccAnalysis")}
            </h2>

            <p className="text-xs font-medium text-muted-foreground mb-2">{t("bySeverity")}</p>
            <SeverityBars counts={ccBySeverity} total={ccTotal} labelFor={(k) => tCc(`severities.${k}` as Parameters<typeof tCc>[0])} />
            <p className="text-xs text-muted-foreground mt-2 mb-4">{tc("totalCount", { count: ccTotal })}</p>

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

      {/* Case List: 주요 불량 현황 (최근 3개월 · 미종결) — 보고서 출력(인쇄) 전용, 화면에는 노출하지 않음 */}
      {(ncCases.length > 0 || pncCases.length > 0 || ccCases.length > 0) && (
        <div className="hidden print:block mt-8 space-y-6">
          <h2 className="text-base font-bold flex items-center gap-2">
            {t("caseListTitle")}
            <span className="text-xs font-normal text-muted-foreground">({t("caseListScope")})</span>
          </h2>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t("ncAnalysis")}
            </h3>
            <CaseListTable cases={ncCases} headers={caseHeaders} emptyLabel={t("noCases")} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <PackageX className="h-4 w-4 text-purple-500" />
              {t("pncAnalysis")}
            </h3>
            <CaseListTable cases={pncCases} headers={caseHeaders} emptyLabel={t("noCases")} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-red-500" />
              {t("ccAnalysis")}
            </h3>
            <CaseListTable cases={ccCases} headers={caseHeaders} emptyLabel={t("noCases")} />
          </div>
        </div>
      )}

      {ncTotal === 0 && pncTotal === 0 && ccTotal === 0 && (
        <div className="text-sm text-muted-foreground text-center py-12">
          {label}
        </div>
      )}
    </div>
  );
}
