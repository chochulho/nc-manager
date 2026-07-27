"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Edit2, X, ClipboardCheck, Plus } from "lucide-react";
import { AttachmentSection } from "@/components/nc/attachment-section";
import { AdminRecordPanel } from "@/components/nc/admin-record-panel";
import { NotificationSection } from "@/components/nc/notification-section";
import { WriteGuidePanel } from "@/components/write-guide-panel";

interface Option { id: string; name: string; code?: string; number?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }

interface PNC {
  id: string; pncNumber: string; title: string; description: string | null;
  discoveredAt: Date; discoveryStage: string; severity: string; status: string;
  occurrenceSiteId: string | null;
  discoveredBySiteId: string | null; discoveredByProcessId: string | null;
  occurrenceSupplierId: string | null; partId: string | null;
  lotNumber: string | null; quantityInspected: string | null; quantityNc: string | null;
  categoryL2Id: string | null; safetyRelated: boolean; regulatoryRelated: boolean; capaRequired: boolean;
  capaId: string | null;
  dispositionType: string | null; dispositionNotes: string | null;
  costScrap: string | null; costRework: string | null; costOther: string | null;
  createdAt: Date; updatedAt: Date;
}

interface LinkedCapa { id: string; capaNumber: string; status: string }

interface Props {
  pnc: PNC;
  sites: Option[]; processes: Option[]; parts: Array<{ id: string; name: string; number: string }>;
  suppliers: Option[]; categoriesL2: CategoryL2[];
  linkedCapa: LinkedCapa | null;
  isOrgAdmin?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-50 text-red-700", contained: "bg-orange-50 text-orange-700",
  disposition_decided: "bg-yellow-50 text-yellow-700",
  capa_in_progress: "bg-blue-50 text-blue-700", closed: "bg-green-50 text-green-700",
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800", major: "bg-orange-100 text-orange-800", minor: "bg-yellow-100 text-yellow-800",
};

export function PartNCDetailClient({ pnc, sites, processes, parts, suppliers, categoriesL2, linkedCapa, isOrgAdmin = false }: Props) {
  const t = useTranslations("partNc");
  const tc = useTranslations("common");
  const tCapa = useTranslations("capa");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discoveredLocationType, setDiscoveredLocationType] = useState<"site" | "supplier">(
    pnc.occurrenceSupplierId ? "supplier" : "site"
  );
  const [form, setForm] = useState({
    title: pnc.title,
    description: pnc.description ?? "",
    discoveredAt: pnc.discoveredAt ? new Date(pnc.discoveredAt).toISOString().slice(0, 10) : "",
    discoveryStage: pnc.discoveryStage,
    severity: pnc.severity,
    status: pnc.status,
    occurrenceSiteId: pnc.occurrenceSiteId ?? "",
    discoveredBySiteId: pnc.discoveredBySiteId ?? "",
    discoveredByProcessId: pnc.discoveredByProcessId ?? "",
    occurrenceSupplierId: pnc.occurrenceSupplierId ?? "",
    partId: pnc.partId ?? "",
    lotNumber: pnc.lotNumber ?? "",
    quantityInspected: pnc.quantityInspected ?? "",
    quantityNc: pnc.quantityNc ?? "",
    categoryL2Id: pnc.categoryL2Id ?? "",
    safetyRelated: pnc.safetyRelated,
    regulatoryRelated: pnc.regulatoryRelated,
    capaRequired: pnc.capaRequired,
    dispositionType: pnc.dispositionType ?? "",
    dispositionNotes: pnc.dispositionNotes ?? "",
    costScrap: pnc.costScrap ?? "",
    costRework: pnc.costRework ?? "",
    costOther: pnc.costOther ?? "",
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/part-nc/${pnc.id}`, {
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

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]));
  const processMap = Object.fromEntries(processes.map(p => [p.id, p.name]));
  const partMap = Object.fromEntries(parts.map(p => [p.id, `${p.number} — ${p.name}`]));
  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));
  const catMap = Object.fromEntries(categoriesL2.map(c => [c.id, `[${c.code}] ${c.nameKo}`]));

  const stageOptions = ["incoming","in_process","outgoing","internal_audit","msa","other"] as const;
  const severityOptions = ["critical","major","minor"] as const;
  const statusOptions = ["open","contained","disposition_decided","capa_in_progress","closed"] as const;
  const dispositionOptions = ["rework","deviation","scrap","return_to_supplier","use_as_is"] as const;

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/part-nc"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">{pnc.pncNumber}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[pnc.status] ?? ""}`}>
                {t(`statuses.${pnc.status}` as Parameters<typeof t>[0]) ?? pnc.status}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLORS[pnc.severity] ?? ""}`}>
                {t(`severities.${pnc.severity}` as Parameters<typeof t>[0]) ?? pnc.severity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{pnc.title}</p>
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
          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{t("basicInfo")}</h2>
            {editing ? (
              <>
                <div>
                  <Label>{tc("title")} *</Label>
                  <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("discoveredAt")}</Label>
                    <Input type="date" value={form.discoveredAt} onChange={(e) => set("discoveredAt", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("discoveryStage")}</Label>
                    <Select value={form.discoveryStage} onValueChange={(v: string) => set("discoveryStage", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stageOptions.map(v => <SelectItem key={v} value={v}>{t(`stages.${v}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("severity")}</Label>
                    <Select value={form.severity} onValueChange={(v: string) => set("severity", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {severityOptions.map(v => <SelectItem key={v} value={v}>{t(`severities.${v}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("status")}</Label>
                    <Select value={form.status} onValueChange={(v: string) => set("status", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(v => <SelectItem key={v} value={v}>{t(`statuses.${v}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("category")}</Label>
                    <Select value={form.categoryL2Id} onValueChange={(v: string) => set("categoryL2Id", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                      <SelectContent>
                        {categoriesL2.map(c => <SelectItem key={c.id} value={c.id}>[{c.code}] {c.nameKo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t("description")}</Label>
                  <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className="mt-1" />
                </div>
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">{t("discoveredAt")}</dt><dd className="font-medium mt-0.5">{new Date(pnc.discoveredAt).toLocaleDateString()}</dd></div>
                <div><dt className="text-muted-foreground">{t("discoveryStage")}</dt><dd className="font-medium mt-0.5">{t(`stages.${pnc.discoveryStage}` as Parameters<typeof t>[0]) ?? pnc.discoveryStage}</dd></div>
                <div><dt className="text-muted-foreground">{t("category")}</dt><dd className="font-medium mt-0.5">{pnc.categoryL2Id ? catMap[pnc.categoryL2Id] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">{tc("registeredAt")}</dt><dd className="font-medium mt-0.5">{new Date(pnc.createdAt).toLocaleDateString()}</dd></div>
                {pnc.description && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">{t("description")}</dt>
                    <dd className="font-medium mt-0.5 whitespace-pre-wrap">{pnc.description}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Subject info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{tc("targetInfo")}</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("part")}</Label>
                  <Select value={form.partId} onValueChange={(v: string) => set("partId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{tc("lotNumber")}</Label>
                  <Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} placeholder="LOT-XXXXXX" className="mt-1" />
                </div>
                <div>
                  <Label>{t("quantityInspected")}</Label>
                  <Input type="number" value={form.quantityInspected} onChange={(e) => set("quantityInspected", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>{t("quantityNc")}</Label>
                  <Input type="number" value={form.quantityNc} onChange={(e) => set("quantityNc", e.target.value)} className="mt-1" />
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">{t("part")}</dt><dd className="font-medium mt-0.5">{pnc.partId ? partMap[pnc.partId] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">{tc("lotNumber")}</dt><dd className="font-medium mt-0.5">{pnc.lotNumber ?? "-"}</dd></div>
                <div><dt className="text-muted-foreground">{t("quantityInspected")}</dt><dd className="font-medium mt-0.5">{pnc.quantityInspected ?? "-"}</dd></div>
                <div><dt className="text-muted-foreground">{t("quantityNc")}</dt><dd className="font-medium mt-0.5">{pnc.quantityNc ?? "-"}</dd></div>
              </dl>
            )}
          </div>

          {/* Disposition */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{t("dispositionSection")}</h2>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>{t("dispositionType")}</Label>
                  <Select value={form.dispositionType} onValueChange={(v: string) => set("dispositionType", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>
                      {dispositionOptions.map(v => <SelectItem key={v} value={v}>{t(`dispositions.${v}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("dispositionNotes")}</Label>
                  <Textarea value={form.dispositionNotes} onChange={(e) => set("dispositionNotes", e.target.value)} rows={3} className="mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>{t("costScrap")}</Label><Input type="number" value={form.costScrap} onChange={(e) => set("costScrap", e.target.value)} placeholder="0" className="mt-1" /></div>
                  <div><Label>{t("costRework")}</Label><Input type="number" value={form.costRework} onChange={(e) => set("costRework", e.target.value)} placeholder="0" className="mt-1" /></div>
                  <div><Label>{t("costOther")}</Label><Input type="number" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} placeholder="0" className="mt-1" /></div>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">{t("dispositionType")}</dt><dd className="font-medium mt-0.5">{pnc.dispositionType ? (t(`dispositions.${pnc.dispositionType}` as Parameters<typeof t>[0]) ?? pnc.dispositionType) : "-"}</dd></div>
                <div>
                  <dt className="text-muted-foreground">{t("copqTotal")}</dt>
                  <dd className="font-medium mt-0.5">
                    {(Number(pnc.costScrap ?? 0) + Number(pnc.costRework ?? 0) + Number(pnc.costOther ?? 0)).toLocaleString()}
                  </dd>
                </div>
                {pnc.dispositionNotes && (
                  <div className="col-span-2"><dt className="text-muted-foreground">{t("dispositionNotes")}</dt><dd className="font-medium mt-0.5 whitespace-pre-wrap">{pnc.dispositionNotes}</dd></div>
                )}
              </dl>
            )}
          </div>

          {/* CAPA link */}
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
                <Link href={`/capa/new?sourceType=part_nc&sourceId=${pnc.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("createCapa")}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <NotificationSection entityType="part_nc" entityId={pnc.id} />
          <AttachmentSection entityType="part_nc" entityId={pnc.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{t("occurrenceLocation")}</h2>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>{t("site")}</Label>
                  <Select value={form.occurrenceSiteId} onValueChange={(v: string) => set("occurrenceSiteId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("discoveredByType")}</Label>
                  <div className="mt-1 inline-flex rounded-lg border border-gray-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscoveredLocationType("site");
                        set("occurrenceSupplierId", "");
                      }}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${discoveredLocationType === "site" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-gray-50"}`}
                    >
                      {t("site")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscoveredLocationType("supplier");
                        set("discoveredBySiteId", "");
                      }}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${discoveredLocationType === "supplier" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-gray-50"}`}
                    >
                      {t("supplier")}
                    </button>
                  </div>
                </div>
                {discoveredLocationType === "site" ? (
                  <div>
                    <Label>{t("discoveredBySite")}</Label>
                    <Select value={form.discoveredBySiteId} onValueChange={(v: string) => set("discoveredBySiteId", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                      <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>{t("supplier")}</Label>
                    <Select value={form.occurrenceSupplierId} onValueChange={(v: string) => set("occurrenceSupplierId", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>{t("discoveredByProcess")}</Label>
                  <Select value={form.discoveredByProcessId} onValueChange={(v: string) => set("discoveredByProcessId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-muted-foreground">{t("site")}</dt><dd className="font-medium mt-0.5">{pnc.occurrenceSiteId ? siteMap[pnc.occurrenceSiteId] ?? "-" : "-"}</dd></div>
                {pnc.occurrenceSupplierId ? (
                  <div><dt className="text-muted-foreground">{t("supplier")}</dt><dd className="font-medium mt-0.5">{supplierMap[pnc.occurrenceSupplierId] ?? "-"}</dd></div>
                ) : (
                  <div><dt className="text-muted-foreground">{t("discoveredBySite")}</dt><dd className="font-medium mt-0.5">{pnc.discoveredBySiteId ? siteMap[pnc.discoveredBySiteId] ?? "-" : "-"}</dd></div>
                )}
                <div><dt className="text-muted-foreground">{t("discoveredByProcess")}</dt><dd className="font-medium mt-0.5">{pnc.discoveredByProcessId ? processMap[pnc.discoveredByProcessId] ?? "-" : "-"}</dd></div>
              </dl>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title">{tc("attributes")}</h2>
            {editing ? (
              <div className="space-y-2">
                {([
                  { key: "safetyRelated", label: tc("safetyRelated") },
                  { key: "regulatoryRelated", label: t("regulatoryRelated") },
                  { key: "capaRequired", label: t("capaRequired") },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                      onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pnc.safetyRelated && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">{tc("safetyRelated")}</span>}
                {pnc.regulatoryRelated && <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">{t("regulatoryRelated")}</span>}
                {pnc.capaRequired && <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{t("capaRequired")}</span>}
                {!pnc.safetyRelated && !pnc.regulatoryRelated && !pnc.capaRequired && <span className="text-sm text-muted-foreground">{tc("none")}</span>}
              </div>
            )}
          </div>

          {isOrgAdmin && (
            <AdminRecordPanel
              currentNumber={pnc.pncNumber}
              deleteApiUrl={`/api/nc/part-nc/${pnc.id}`}
              renumberApiUrl={`/api/nc/part-nc/${pnc.id}/renumber`}
              listHref="/part-nc"
              onRenumbered={() => router.refresh()}
            />
          )}
        </div>
      </div>
      </div>
      <WriteGuidePanel type="part_nc" className="mt-[4.5rem]" />
    </div>
  );
}
