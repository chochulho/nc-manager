"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Paperclip, X, Plus, MapPin } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { WriteGuidePanel } from "@/components/write-guide-panel";

interface Option { id: string; name: string; code?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }

interface Props {
  customers: Option[];
  parts: Array<{ id: string; name: string; number: string }>;
  categoriesL2: CategoryL2[];
}

export function NewComplaintForm({ customers, parts, categoriesL2 }: Props) {
  const t = useTranslations("complaint");
  const tc = useTranslations("common");
  const tn = useTranslations("nc");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dtcInput, setDtcInput] = useState("");
  const [fieldClaim, setFieldClaim] = useState({
    vehicleModel: "", vehicleVin: "", manufacturedAt: "",
    soldAt: "", repairedAt: "",
    incidentLocationType: "",
    region: "", dealerName: "", mileageKm: "",
    usageMonths: "", symptomDescription: "", dtcCodes: [] as string[],
  });
  const [form, setForm] = useState({
    title: "",
    customerDescription: "",
    customerId: "",
    customerSiteName: "",
    customerReference: "",
    receivedAt: new Date().toISOString().slice(0, 10),
    receivedChannel: "",
    isFormal: true,
    discoveryStage: "",
    severity: "",
    partId: "",
    lotNumber: "",
    quantityClaimed: "",
    categoryL2Id: "",
    safetyRelated: false,
    recallRisk: false,
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setFc(key: string, value: string) {
    setFieldClaim((prev) => ({ ...prev, [key]: value }));
  }

  function addDtc() {
    const val = dtcInput.trim().toUpperCase();
    if (!val) return;
    if (fieldClaim.dtcCodes.includes(val)) return;
    setFieldClaim((prev) => ({ ...prev, dtcCodes: [...prev.dtcCodes, val] }));
    setDtcInput("");
  }

  function removeDtc(code: string) {
    setFieldClaim((prev) => ({ ...prev, dtcCodes: prev.dtcCodes.filter((c) => c !== code) }));
  }

  const isFieldClaim = form.discoveryStage === "field" || form.discoveryStage === "warranty";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = isFieldClaim
        ? {
            ...form,
            fieldClaim: {
              ...fieldClaim,
              usageMonths: fieldClaim.usageMonths !== "" ? parseInt(fieldClaim.usageMonths) : null,
              manufacturedAt: fieldClaim.manufacturedAt ? `${fieldClaim.manufacturedAt}-01` : null,
              extraData: {
                soldAt: fieldClaim.soldAt || null,
                repairedAt: fieldClaim.repairedAt || null,
                incidentLocationType: fieldClaim.incidentLocationType || null,
              },
            },
          }
        : form;

      const res = await fetch("/api/nc/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? tc("error")); return; }

      if (pendingFiles.length > 0) {
        let uploaded = 0;
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "customer_complaint");
          fd.append("entityId", data.id);
          const r = await fetch("/api/nc/attachments", { method: "POST", body: fd });
          if (r.ok) uploaded++;
        }
        toast.success(tc("registeredSuccessAttachments", { number: data.complaintNumber, count: uploaded }));
      } else {
        toast.success(tc("registeredSuccess", { number: data.complaintNumber }));
      }

      router.push(`/complaints/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/complaints"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">{t("newForm")}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* 기본 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{t("basicInfo")}</h2>
              <div>
                <Label>{tc("title")} *</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder={t("title2")} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("receivedAt")} *</Label>
                  <Input type="date" value={form.receivedAt} onChange={(e) => set("receivedAt", e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>{t("receivedChannel")} *</Label>
                  <Select value={form.receivedChannel} onValueChange={(v: string) => set("receivedChannel", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portal">{t("channels.portal")}</SelectItem>
                      <SelectItem value="email">{t("channels.email")}</SelectItem>
                      <SelectItem value="phone">{t("channels.phone")}</SelectItem>
                      <SelectItem value="meeting">{t("channels.meeting")}</SelectItem>
                      <SelectItem value="informal">{t("channels.informal")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("discoveryStage")} *</Label>
                  <Select value={form.discoveryStage} onValueChange={(v: string) => set("discoveryStage", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline_0km">{t("stages.inline_0km")}</SelectItem>
                      <SelectItem value="field">{t("stages.field")}</SelectItem>
                      <SelectItem value="warranty">{t("stages.warranty")}</SelectItem>
                      <SelectItem value="other">{t("stages.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("severity")} *</Label>
                  <Select value={form.severity} onValueChange={(v: string) => set("severity", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">{tn("severities.critical")}</SelectItem>
                      <SelectItem value="major">{tn("severities.major")}</SelectItem>
                      <SelectItem value="minor">{tn("severities.minor")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{tn("category")}</Label>
                  <Select value={form.categoryL2Id} onValueChange={(v: string) => set("categoryL2Id", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>{categoriesL2.map(c => <SelectItem key={c.id} value={c.id}>[{c.code}] {c.nameKo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("isFormal")}</Label>
                  <Select value={form.isFormal ? "true" : "false"} onValueChange={(v: string) => set("isFormal", v === "true")}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("formal")}</SelectItem>
                      <SelectItem value="false">{t("informal")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("customerDescription")}</Label>
                <Textarea value={form.customerDescription} onChange={(e) => set("customerDescription", e.target.value)} placeholder={t("customerDescription")} rows={4} className="mt-1" />
              </div>
            </div>

            {/* 대상 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{t("targetInfo")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{tn("part")}</Label>
                  <Select value={form.partId} onValueChange={(v: string) => set("partId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("lotNumber")}</Label>
                  <Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} placeholder="LOT-XXXXXX" className="mt-1" />
                </div>
                <div>
                  <Label>{t("quantity")}</Label>
                  <Input type="number" value={form.quantityClaimed} onChange={(e) => set("quantityClaimed", e.target.value)} placeholder="0" className="mt-1" />
                </div>
              </div>
            </div>

            {/* 필드 클레임 정보 */}
            {isFieldClaim && (
              <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-4">
                <h2 className="section-title flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  {t("fieldClaimSection")}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("vehicleModel")}</Label>
                    <Input value={fieldClaim.vehicleModel} onChange={(e) => setFc("vehicleModel", e.target.value)} placeholder={t("vehicleModelPlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("manufacturedAt")}</Label>
                    <Input type="month" value={fieldClaim.manufacturedAt} onChange={(e) => setFc("manufacturedAt", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>VIN</Label>
                    <Input value={fieldClaim.vehicleVin} onChange={(e) => setFc("vehicleVin", e.target.value)} placeholder={t("vinPlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("usageMonths")}</Label>
                    <Input type="number" value={fieldClaim.usageMonths} onChange={(e) => setFc("usageMonths", e.target.value)} placeholder={`${tc("eg")} 24`} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("soldAt")}</Label>
                    <Input type="date" value={fieldClaim.soldAt} onChange={(e) => setFc("soldAt", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("repairedAt")}</Label>
                    <Input type="date" value={fieldClaim.repairedAt} onChange={(e) => setFc("repairedAt", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("incidentLocationType")}</Label>
                    <Select value={fieldClaim.incidentLocationType} onValueChange={(v) => setFc("incidentLocationType", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dealer">{t("incidentLocationTypes.dealer")}</SelectItem>
                        <SelectItem value="customer_factory">{t("incidentLocationTypes.customer_factory")}</SelectItem>
                        <SelectItem value="field">{t("incidentLocationTypes.field")}</SelectItem>
                        <SelectItem value="other">{t("incidentLocationTypes.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("region")}</Label>
                    <Input value={fieldClaim.region} onChange={(e) => setFc("region", e.target.value)} placeholder={t("regionPlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("dealer")}</Label>
                    <Input value={fieldClaim.dealerName} onChange={(e) => setFc("dealerName", e.target.value)} placeholder={t("dealerPlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("mileageKm")}</Label>
                    <Input type="number" value={fieldClaim.mileageKm} onChange={(e) => setFc("mileageKm", e.target.value)} placeholder={`${tc("eg")} 35000`} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>{t("dtcCodes")}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={dtcInput} onChange={(e) => setDtcInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDtc(); } }}
                      placeholder={t("dtcPlaceholder")} className="flex-1 uppercase" />
                    <Button type="button" variant="outline" size="sm" onClick={addDtc} className="h-9 px-3">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {fieldClaim.dtcCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {fieldClaim.dtcCodes.map((code) => (
                        <span key={code} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono font-medium text-emerald-800">
                          {code}
                          <button type="button" onClick={() => removeDtc(code)} className="text-emerald-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>{t("symptomDescription")}</Label>
                  <Textarea value={fieldClaim.symptomDescription} onChange={(e) => setFc("symptomDescription", e.target.value)}
                    placeholder={t("symptomPlaceholder")} rows={3} className="mt-1" />
                </div>
              </div>
            )}
          </div>

          {/* 사이드 */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{t("customerInfo")}</h2>
              <div>
                <Label>{t("customer")} *</Label>
                <Select value={form.customerId} onValueChange={(v: string) => set("customerId", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("customerSite")}</Label>
                <Input value={form.customerSiteName} onChange={(e) => set("customerSiteName", e.target.value)} placeholder={t("customerSitePlaceholder")} className="mt-1" />
              </div>
              <div>
                <Label>{t("customerReference")}</Label>
                <Input value={form.customerReference} onChange={(e) => set("customerReference", e.target.value)} placeholder={t("customerRefPlaceholder")} className="mt-1" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="section-title">{tc("attributes")}</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.safetyRelated} onChange={(e) => set("safetyRelated", e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">{tc("safetyRelated")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.recallRisk} onChange={(e) => set("recallRisk", e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium text-red-600">{t("recallRisk")}</span>
              </label>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="section-title flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {tc("attachmentsHint")}
              </h2>
              <label
                className="block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files);
                  setPendingFiles((prev) => [...prev, ...dropped]);
                }}
              >
                <input type="file" multiple className="hidden"
                  onChange={(e) => { if (e.target.files) setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]); }} />
                <Paperclip className="h-5 w-5 mx-auto mb-1.5 text-gray-400" />
                <p className="text-sm text-muted-foreground">{tc("dropzoneHint")}</p>
              </label>
              {pendingFiles.length > 0 && (
                <div className="space-y-1">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 text-sm">
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)}KB` : `${(f.size / 1024 / 1024).toFixed(1)}MB`}
                      </span>
                      <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? tc("saving") : tc("register")}
            </Button>
          </div>
        </div>
      </form>
      </div>
      <WriteGuidePanel type="complaint" className="mt-[4.5rem]" />
    </div>
  );
}
