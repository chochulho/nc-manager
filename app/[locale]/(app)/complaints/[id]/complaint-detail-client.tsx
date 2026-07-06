"use client";

import { useState } from "react";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Edit2, X, Clock, AlertCircle, ClipboardCheck, Plus, Loader2 } from "lucide-react";
import { AttachmentSection } from "@/components/nc/attachment-section";
import { AnalysisReportSection } from "@/components/nc/analysis-report-section";
import { WriteGuidePanel } from "@/components/write-guide-panel";
import { FieldClaimDetailSection } from "@/components/nc/field-claim-detail-section";
import { ComplaintPhotosPanel } from "@/components/nc/complaint-photos-panel";
import { AdminRecordPanel } from "@/components/nc/admin-record-panel";

interface Option { id: string; name: string; code?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }
interface Complaint {
  id: string; complaintNumber: string; title: string; customerDescription: string | null;
  siteId: string | null;
  customerId: string; customerSiteName: string | null; customerReference: string | null;
  receivedAt: Date; occurredAt: Date | null; receivedChannel: string; isFormal: boolean;
  discoveryStage: string; recurrenceType: string | null; severity: string; status: string;
  partId: string | null; partNumberDetail: string | null; lotNumber: string | null;
  quantityClaimed: string | null; quantityConfirmed: string | null;
  categoryL2Id: string | null; safetyRelated: boolean; recallRisk: boolean;
  capaId: string | null;
  initialResponseDueAt: Date | null; initialResponseSentAt: Date | null;
  containmentDueAt: Date | null; containedAt: Date | null;
  finalReportDueAt: Date | null; finalReportSentAt: Date | null;
  resolutionType: string | null;
  costRecallReturn: string | null; costPenalty: string | null; costOther: string | null;
  receivedByName: string | null;
  createdAt: Date;
}

interface LinkedCapa { id: string; capaNumber: string; status: string }

interface Props {
  complaint: Complaint;
  customers: Option[];
  parts: Array<{ id: string; name: string; number: string }>;
  categoriesL2: CategoryL2[];
  sites: Option[];
  linkedCapa: LinkedCapa | null;
  isOrgAdmin?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-50 text-blue-700", acknowledged: "bg-indigo-50 text-indigo-700",
  contained: "bg-yellow-50 text-yellow-700", investigating: "bg-orange-50 text-orange-700",
  "8d_in_progress": "bg-purple-50 text-purple-700", final_reported: "bg-teal-50 text-teal-700",
  closed: "bg-green-50 text-green-700", closed_ntf: "bg-gray-100 text-gray-600",
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800", major: "bg-orange-100 text-orange-800", minor: "bg-yellow-100 text-yellow-800",
};

const STATUS_KEYS = ["received", "acknowledged", "contained", "investigating", "8d_in_progress", "final_reported", "closed", "closed_ntf"] as const;
const RESOLUTION_TYPE_KEYS = ["confirmed_nc", "ntf", "customer_misuse", "partial"] as const;

function SlaIndicator({
  label, due, sent, completedLabel,
}: {
  label: string; due: Date | null; sent: Date | null; completedLabel: string;
}) {
  if (!due) return null;
  const overdue = !sent && new Date() > new Date(due);
  const done = !!sent;
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${done ? "bg-green-50" : overdue ? "bg-red-50" : "bg-gray-50"}`}>
      <span className={`font-medium ${done ? "text-green-700" : overdue ? "text-red-700" : "text-gray-700"}`}>{label}</span>
      <div className="text-right">
        {done ? (
          <span className="text-green-600">{completedLabel} {new Date(sent!).toLocaleDateString()}</span>
        ) : (
          <span className={overdue ? "text-red-600 font-semibold flex items-center gap-1" : "text-gray-500"}>
            {overdue && <Clock className="h-3 w-3" />}
            {new Date(due).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export function ComplaintDetailClient({ complaint, customers, parts, categoriesL2, sites, linkedCapa, isOrgAdmin = false }: Props) {
  const router = useRouter();
  const t = useTranslations("complaint");
  const tc = useTranslations("common");
  const tCapa = useTranslations("capa");
  const tn = useTranslations("nc");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copqEditing, setCopqEditing] = useState(false);
  const [copqSaving, setCopqSaving] = useState(false);
  const [copqForm, setCopqForm] = useState({
    costRecallReturn: complaint.costRecallReturn ?? "",
    costPenalty: complaint.costPenalty ?? "",
    costOther: complaint.costOther ?? "",
  });
  const [form, setForm] = useState({
    siteId: complaint.siteId ?? "",
    title: complaint.title,
    customerDescription: complaint.customerDescription ?? "",
    status: complaint.status,
    occurredAt: complaint.occurredAt ? new Date(complaint.occurredAt).toISOString().slice(0, 10) : "",
    recurrenceType: complaint.recurrenceType ?? "",
    severity: complaint.severity,
    customerId: complaint.customerId,
    customerSiteName: complaint.customerSiteName ?? "",
    customerReference: complaint.customerReference ?? "",
    partId: complaint.partId ?? "",
    partNumberDetail: complaint.partNumberDetail ?? "",
    lotNumber: complaint.lotNumber ?? "",
    quantityClaimed: complaint.quantityClaimed ?? "",
    quantityConfirmed: complaint.quantityConfirmed ?? "",
    categoryL2Id: complaint.categoryL2Id ?? "",
    safetyRelated: complaint.safetyRelated,
    recallRisk: complaint.recallRisk,
    resolutionType: complaint.resolutionType ?? "",
    initialResponseSentAt: complaint.initialResponseSentAt ? new Date(complaint.initialResponseSentAt).toISOString().slice(0, 10) : "",
    containedAt: complaint.containedAt ? new Date(complaint.containedAt).toISOString().slice(0, 10) : "",
    finalReportSentAt: complaint.finalReportSentAt ? new Date(complaint.finalReportSentAt).toISOString().slice(0, 10) : "",
    costRecallReturn: complaint.costRecallReturn ?? "",
    costPenalty: complaint.costPenalty ?? "",
    costOther: complaint.costOther ?? "",
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { toast.error(tc("error")); return; }
      toast.success(tc("success"));
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleCopqSave() {
    setCopqSaving(true);
    try {
      const res = await fetch(`/api/nc/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copqForm),
      });
      if (!res.ok) { toast.error(tc("error")); return; }
      toast.success(tc("success"));
      setCopqEditing(false);
      router.refresh();
    } finally {
      setCopqSaving(false);
    }
  }

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]));
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
  const partMap = Object.fromEntries(parts.map(p => [p.id, `${p.number} — ${p.name}`]));
  const catMap = Object.fromEntries(categoriesL2.map(c => [c.id, `[${c.code}] ${c.nameKo}`]));

  const copqTotal = Number(complaint.costRecallReturn ?? 0)
    + Number(complaint.costPenalty ?? 0)
    + Number(complaint.costOther ?? 0);

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/complaints"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">{complaint.complaintNumber}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[complaint.status] ?? ""}`}>
                {t(`statuses.${complaint.status}` as Parameters<typeof t>[0]) ?? complaint.status}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLORS[complaint.severity] ?? ""}`}>
                {t(`severities.${complaint.severity}` as Parameters<typeof t>[0]) ?? complaint.severity}
              </span>
              {complaint.safetyRelated && <AlertCircle className="h-4 w-4 text-red-600" />}
              {complaint.recallRisk && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">{tc("recall")}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{complaint.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={handleSave} size="sm" disabled={saving}>
                <Save className="h-4 w-4 mr-1" />{saving ? tc("saving") : tc("save")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" />{tc("cancel")}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" />{tc("edit")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{t("basicInfo")}</h2>
            {editing ? (
              <>
                <div><Label>{tc("title")}</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("status")}</Label>
                    <Select value={form.status} onValueChange={(v: string) => set("status", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_KEYS.map((v) => (
                          <SelectItem key={v} value={v}>{t(`statuses.${v}` as Parameters<typeof t>[0])}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t("occurredAt")}</Label><Input type="date" value={form.occurredAt} onChange={(e) => set("occurredAt", e.target.value)} className="mt-1" /></div>
                  <div>
                    <Label>{t("recurrenceType")}</Label>
                    <Select value={form.recurrenceType} onValueChange={(v: string) => set("recurrenceType", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">{t("recurrenceTypes.new")}</SelectItem>
                        <SelectItem value="repeat">{t("recurrenceTypes.repeat")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("resolutionType")}</Label>
                    <Select value={form.resolutionType} onValueChange={(v: string) => set("resolutionType", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                      <SelectContent>
                        {RESOLUTION_TYPE_KEYS.map((v) => (
                          <SelectItem key={v} value={v}>{t(`resolutionTypes.${v}` as Parameters<typeof t>[0])}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("part")}</Label>
                    <Select value={form.partId} onValueChange={(v: string) => set("partId", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                      <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t("partNumberDetail")}</Label><Input value={form.partNumberDetail} onChange={(e) => set("partNumberDetail", e.target.value)} placeholder={t("partNumberDetailPlaceholder")} className="mt-1" /></div>
                  <div><Label>{t("lotNumber")}</Label><Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} className="mt-1" /></div>
                  <div><Label>{t("quantity")}</Label><Input type="number" value={form.quantityClaimed} onChange={(e) => set("quantityClaimed", e.target.value)} className="mt-1" /></div>
                  <div><Label>{t("quantityConfirmed")}</Label><Input type="number" value={form.quantityConfirmed} onChange={(e) => set("quantityConfirmed", e.target.value)} className="mt-1" /></div>
                </div>
                <div><Label>{t("customerDescription")}</Label><Textarea value={form.customerDescription} onChange={(e) => set("customerDescription", e.target.value)} rows={4} className="mt-1" /></div>
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">{t("receivedAt")}</dt><dd className="font-medium mt-0.5">{new Date(complaint.receivedAt).toLocaleDateString()}</dd></div>
                {complaint.occurredAt && <div><dt className="text-muted-foreground">{t("occurredAt")}</dt><dd className="font-medium mt-0.5">{new Date(complaint.occurredAt).toLocaleDateString()}</dd></div>}
                <div><dt className="text-muted-foreground">{t("receivedChannel")}</dt><dd className="font-medium mt-0.5">{t(`channels.${complaint.receivedChannel}` as Parameters<typeof t>[0]) ?? complaint.receivedChannel}</dd></div>
                <div><dt className="text-muted-foreground">{t("discoveryStage")}</dt><dd className="font-medium mt-0.5">{t(`stages.${complaint.discoveryStage}` as Parameters<typeof t>[0]) ?? complaint.discoveryStage}</dd></div>
                {complaint.recurrenceType && <div><dt className="text-muted-foreground">{t("recurrenceType")}</dt><dd className="font-medium mt-0.5">{t(`recurrenceTypes.${complaint.recurrenceType}` as Parameters<typeof t>[0])}</dd></div>}
                <div><dt className="text-muted-foreground">{t("isFormal")}</dt><dd className="font-medium mt-0.5">{complaint.isFormal ? t("formal") : t("informal")}</dd></div>
                <div><dt className="text-muted-foreground">{t("part")}</dt><dd className="font-medium mt-0.5">{complaint.partId ? partMap[complaint.partId] ?? "-" : "-"}</dd></div>
                {complaint.partNumberDetail && <div><dt className="text-muted-foreground">{t("partNumberDetail")}</dt><dd className="font-medium mt-0.5">{complaint.partNumberDetail}</dd></div>}
                <div><dt className="text-muted-foreground">{t("category")}</dt><dd className="font-medium mt-0.5">{complaint.categoryL2Id ? catMap[complaint.categoryL2Id] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">{t("quantity")}</dt><dd className="font-medium mt-0.5">{complaint.quantityClaimed ?? "-"}</dd></div>
                <div><dt className="text-muted-foreground">{t("quantityConfirmed")}</dt><dd className="font-medium mt-0.5">{complaint.quantityConfirmed ?? "-"}</dd></div>
                {complaint.customerDescription && (
                  <div className="col-span-2"><dt className="text-muted-foreground">{t("customerDescription")}</dt><dd className="font-medium mt-0.5 whitespace-pre-wrap">{complaint.customerDescription}</dd></div>
                )}
              </dl>
            )}
          </div>

          {/* Field Claim Details */}
          {(complaint.discoveryStage === "field" || complaint.discoveryStage === "warranty") && (
            <FieldClaimDetailSection complaintId={complaint.id} />
          )}

          {/* Response Tracking */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{t("sla.responseTracking")}</h2>
            {editing ? (
              <div className="grid grid-cols-3 gap-4">
                <div><Label>{t("sla.initialResponseSentAt")}</Label><Input type="date" value={form.initialResponseSentAt} onChange={(e) => set("initialResponseSentAt", e.target.value)} className="mt-1" /></div>
                <div><Label>{t("sla.containedAt")}</Label><Input type="date" value={form.containedAt} onChange={(e) => set("containedAt", e.target.value)} className="mt-1" /></div>
                <div><Label>{t("sla.finalReportSentAt")}</Label><Input type="date" value={form.finalReportSentAt} onChange={(e) => set("finalReportSentAt", e.target.value)} className="mt-1" /></div>
              </div>
            ) : (
              <div className="space-y-2">
                <SlaIndicator label={t("sla.initialResponse")} due={complaint.initialResponseDueAt} sent={complaint.initialResponseSentAt} completedLabel={t("sla.completed")} />
                <SlaIndicator label={t("sla.containment")} due={complaint.containmentDueAt} sent={complaint.containedAt} completedLabel={t("sla.completed")} />
                <SlaIndicator label={t("sla.finalReport")} due={complaint.finalReportDueAt} sent={complaint.finalReportSentAt} completedLabel={t("sla.completed")} />
              </div>
            )}
          </div>

          {/* COPQ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">{t("copqSection")}</h2>
              {!copqEditing && (
                <Button variant="outline" size="sm" onClick={() => setCopqEditing(true)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" />{tc("edit")}
                </Button>
              )}
            </div>
            {copqEditing ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">{t("costRecallReturn")}</Label>
                    <Input type="number" value={copqForm.costRecallReturn}
                      onChange={(e) => setCopqForm((p) => ({ ...p, costRecallReturn: e.target.value }))}
                      placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">{t("costPenalty")}</Label>
                    <Input type="number" value={copqForm.costPenalty}
                      onChange={(e) => setCopqForm((p) => ({ ...p, costPenalty: e.target.value }))}
                      placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">{t("costOther")}</Label>
                    <Input type="number" value={copqForm.costOther}
                      onChange={(e) => setCopqForm((p) => ({ ...p, costOther: e.target.value }))}
                      placeholder="0" className="mt-1" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setCopqEditing(false);
                    setCopqForm({ costRecallReturn: complaint.costRecallReturn ?? "", costPenalty: complaint.costPenalty ?? "", costOther: complaint.costOther ?? "" });
                  }}>{tc("cancel")}</Button>
                  <Button size="sm" onClick={handleCopqSave} disabled={copqSaving}>
                    {copqSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    {tc("save")}
                  </Button>
                </div>
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t("copqTotal")}</dt>
                  <dd className="font-medium mt-0.5 text-lg">{copqTotal.toLocaleString()} {t("copqUnit")}</dd>
                </div>
                {(complaint.costRecallReturn || complaint.costPenalty || complaint.costOther) && (
                  <div className="col-span-2 grid grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground mt-1">
                    {complaint.costRecallReturn && <span>{t("costRecallReturn")}: {Number(complaint.costRecallReturn).toLocaleString()}</span>}
                    {complaint.costPenalty && <span>{t("costPenalty")}: {Number(complaint.costPenalty).toLocaleString()}</span>}
                    {complaint.costOther && <span>{t("costOther")}: {Number(complaint.costOther).toLocaleString()}</span>}
                  </div>
                )}
                {complaint.resolutionType && (
                  <div>
                    <dt className="text-muted-foreground">{t("resolutionType")}</dt>
                    <dd className="font-medium mt-0.5">
                      {t(`resolutionTypes.${complaint.resolutionType}` as Parameters<typeof t>[0]) ?? complaint.resolutionType}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <AnalysisReportSection
            complaintId={complaint.id}
            capaId={complaint.capaId}
            complaintInfo={{
              complaintNumber: complaint.complaintNumber,
              title: complaint.title,
              customerName: customers.find((c) => c.id === complaint.customerId)?.name ?? "-",
              partName: complaint.partId ? (parts.find((p) => p.id === complaint.partId)?.name ?? "-") : "-",
              receivedAt: complaint.receivedAt,
              severity: complaint.severity,
              resolutionType: complaint.resolutionType,
            }}
            onComplaintClosed={() => router.refresh()}
          />

          {/* CAPA Link */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="section-title flex items-center gap-2 mb-3">
              <ClipboardCheck className="h-4 w-4 text-blue-600" />
              CAPA
            </h2>
            {linkedCapa ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div>
                  <Link href={`/capa/${linkedCapa.id}`} className="font-mono text-sm font-bold text-primary hover:underline">
                    {linkedCapa.capaNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tCapa(`statuses.${linkedCapa.status}` as Parameters<typeof tCapa>[0]) ?? linkedCapa.status}
                  </p>
                </div>
                <Link href={`/capa/${linkedCapa.id}`}>
                  <Button variant="outline" size="sm">{t("viewCapa")}</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t("noLinkedCapa")}</p>
                <Link href={`/capa/new?sourceType=customer_complaint&sourceId=${complaint.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("createCapa")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
          <AttachmentSection entityType="customer_complaint" entityId={complaint.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {sites.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="section-title">{tn("site")}</h2>
              {editing ? (
                <Select value={form.siteId} onValueChange={(v: string) => set("siteId", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                  <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{complaint.siteId ? siteMap[complaint.siteId] ?? "-" : "-"}</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{t("customer")}</h2>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>{t("customer")}</Label>
                  <Select value={form.customerId} onValueChange={(v: string) => set("customerId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t("customerSite")}</Label><Input value={form.customerSiteName} onChange={(e) => set("customerSiteName", e.target.value)} className="mt-1" /></div>
                <div><Label>{t("customerReference")}</Label><Input value={form.customerReference} onChange={(e) => set("customerReference", e.target.value)} className="mt-1" /></div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-muted-foreground">{t("customer")}</dt><dd className="font-medium mt-0.5">{customerMap[complaint.customerId] ?? "-"}</dd></div>
                {complaint.customerSiteName && <div><dt className="text-muted-foreground">{t("customerSite")}</dt><dd className="font-medium mt-0.5">{complaint.customerSiteName}</dd></div>}
                {complaint.customerReference && <div><dt className="text-muted-foreground">{t("customerReference")}</dt><dd className="font-medium mt-0.5 font-mono text-xs">{complaint.customerReference}</dd></div>}
              </dl>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title">{tc("attributes")}</h2>
            {editing ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.safetyRelated} onChange={(e) => set("safetyRelated", e.target.checked)} className="h-4 w-4 rounded" />
                  <span className="text-sm font-medium">{tc("safetyRelated")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.recallRisk} onChange={(e) => set("recallRisk", e.target.checked)} className="h-4 w-4 rounded" />
                  <span className="text-sm font-medium text-red-600">{t("recallRisk")}</span>
                </label>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {complaint.safetyRelated && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">Safety</span>}
                {complaint.recallRisk && <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold">Recall Risk</span>}
                {!complaint.safetyRelated && !complaint.recallRisk && <span className="text-sm text-muted-foreground">{tc("none")}</span>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title">{tc("registrationInfo")}</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-muted-foreground">{tc("registeredAt")}</dt><dd className="font-medium mt-0.5">{new Date(complaint.createdAt).toLocaleDateString()}</dd></div>
              {complaint.receivedByName && (
                <div><dt className="text-muted-foreground">{tc("createdBy")}</dt><dd className="font-medium mt-0.5">{complaint.receivedByName}</dd></div>
              )}
            </dl>
          </div>

          <ComplaintPhotosPanel complaintId={complaint.id} />

          {isOrgAdmin && (
            <AdminRecordPanel
              currentNumber={complaint.complaintNumber}
              deleteApiUrl={`/api/nc/complaints/${complaint.id}`}
              renumberApiUrl={`/api/nc/complaints/${complaint.id}/renumber`}
              listHref="/complaints"
              onRenumbered={() => router.refresh()}
            />
          )}
        </div>
      </div>
      </div>
      <WriteGuidePanel type="complaint" className="mt-[4.5rem]" />
    </div>
  );
}
