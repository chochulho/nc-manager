"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, Plus, X, Edit2, Save, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExtraData {
  soldAt?: string | null;
  repairedAt?: string | null;
  incidentLocationType?: string | null;
}

interface FieldDetail {
  id: string;
  vehicleModel: string | null;
  vehicleVin: string | null;
  manufacturedAt: string | null;
  region: string | null;
  dealerName: string | null;
  mileageKm: string | null;
  usageMonths: number | null;
  dtcCodes: string[] | null;
  symptomDescription: string | null;
  extraData: ExtraData | null;
}

interface Props {
  complaintId: string;
}

export function FieldClaimDetailSection({ complaintId }: Props) {
  const t = useTranslations("complaint");
  const tc = useTranslations("common");

  const [detail, setDetail] = useState<FieldDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [dtcInput, setDtcInput] = useState("");
  const [form, setForm] = useState({
    vehicleModel: "", vehicleVin: "", manufacturedAt: "",
    soldAt: "", repairedAt: "", incidentLocationType: "",
    region: "", dealerName: "", mileageKm: "",
    usageMonths: "", symptomDescription: "", dtcCodes: [] as string[],
  });

  async function load() {
    const res = await fetch(`/api/nc/field-claim-details?complaintId=${complaintId}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
      if (data) resetForm(data);
    }
    setLoading(false);
  }

  function resetForm(d: FieldDetail) {
    setForm({
      vehicleModel: d.vehicleModel ?? "",
      vehicleVin: d.vehicleVin ?? "",
      manufacturedAt: d.manufacturedAt ? new Date(d.manufacturedAt).toISOString().slice(0, 7) : "",
      soldAt: d.extraData?.soldAt ?? "",
      repairedAt: d.extraData?.repairedAt ?? "",
      incidentLocationType: d.extraData?.incidentLocationType ?? "",
      region: d.region ?? "",
      dealerName: d.dealerName ?? "",
      mileageKm: d.mileageKm ?? "",
      usageMonths: d.usageMonths != null ? String(d.usageMonths) : "",
      symptomDescription: d.symptomDescription ?? "",
      dtcCodes: d.dtcCodes ?? [],
    });
  }

  useEffect(() => { load(); }, [complaintId]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/nc/field-claim-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });
      if (!res.ok) { toast.error(tc("error")); return; }
      const data = await res.json();
      setDetail(data);
      resetForm(data);
      setEditing(true);
      setExpanded(true);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/field-claim-details/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          usageMonths: form.usageMonths !== "" ? parseInt(form.usageMonths) : null,
          manufacturedAt: form.manufacturedAt ? `${form.manufacturedAt}-01` : null,
          extraData: {
            soldAt: form.soldAt || null,
            repairedAt: form.repairedAt || null,
            incidentLocationType: form.incidentLocationType || null,
          },
        }),
      });
      if (!res.ok) { toast.error(tc("error")); return; }
      const updated = await res.json();
      setDetail(updated);
      resetForm(updated);
      setEditing(false);
      toast.success(tc("success"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    if (!confirm(t("fieldClaimSection") + "?")) return;
    await fetch(`/api/nc/field-claim-details/${detail.id}`, { method: "DELETE" });
    setDetail(null);
    setEditing(false);
    toast.success(tc("success"));
  }

  function addDtc() {
    const val = dtcInput.trim().toUpperCase();
    if (!val) return;
    if (form.dtcCodes.includes(val)) { toast.error(tc("error")); return; }
    setForm((p) => ({ ...p, dtcCodes: [...p.dtcCodes, val] }));
    setDtcInput("");
  }

  function removeDtc(code: string) {
    setForm((p) => ({ ...p, dtcCodes: p.dtcCodes.filter((c) => c !== code) }));
  }

  if (loading) return null;

  const hasData = detail && (
    detail.vehicleModel || detail.region || detail.dealerName ||
    detail.mileageKm || detail.dtcCodes?.length || detail.usageMonths != null
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          {t("fieldClaimSection")}
        </h2>
        {detail ? (
          <div className="flex items-center gap-1.5">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => { setEditing(true); setExpanded(true); }}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />{tc("edit")}
              </Button>
            )}
            <button onClick={() => setExpanded((v) => !v)} className="p-1 text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {tc("add")}
          </Button>
        )}
      </div>

      {detail && expanded && (
        <div className="space-y-4">
          {editing ? (
            <>
              {/* 차량 기본 정보 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("vehicleModel")}</Label>
                  <Input value={form.vehicleModel} onChange={(e) => setForm((p) => ({ ...p, vehicleModel: e.target.value }))}
                    placeholder="G90, Tucson..." className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">{t("manufacturedAt")}</Label>
                  <Input type="month" value={form.manufacturedAt} onChange={(e) => setForm((p) => ({ ...p, manufacturedAt: e.target.value }))}
                    className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">VIN</Label>
                  <Input value={form.vehicleVin} onChange={(e) => setForm((p) => ({ ...p, vehicleVin: e.target.value }))}
                    className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">{t("usageMonths")}</Label>
                  <Input type="number" value={form.usageMonths} onChange={(e) => setForm((p) => ({ ...p, usageMonths: e.target.value }))}
                    placeholder="24" className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">{t("soldAt")}</Label>
                  <Input type="date" value={form.soldAt} onChange={(e) => setForm((p) => ({ ...p, soldAt: e.target.value }))}
                    className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">{t("repairedAt")}</Label>
                  <Input type="date" value={form.repairedAt} onChange={(e) => setForm((p) => ({ ...p, repairedAt: e.target.value }))}
                    className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">{t("mileageKm")}</Label>
                  <Input type="number" value={form.mileageKm} onChange={(e) => setForm((p) => ({ ...p, mileageKm: e.target.value }))}
                    placeholder="35000" className="mt-1 h-8 text-sm" />
                </div>
              </div>

              {/* 발생장소 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("incidentLocationType")}</Label>
                  <Select value={form.incidentLocationType} onValueChange={(v) => setForm((p) => ({ ...p, incidentLocationType: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dealer">{t("incidentLocationTypes.dealer")}</SelectItem>
                      <SelectItem value="customer_factory">{t("incidentLocationTypes.customer_factory")}</SelectItem>
                      <SelectItem value="field">{t("incidentLocationTypes.field")}</SelectItem>
                      <SelectItem value="other">{t("incidentLocationTypes.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("region")}</Label>
                  <Input value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                    className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">{t("dealer")}</Label>
                  <Input value={form.dealerName} onChange={(e) => setForm((p) => ({ ...p, dealerName: e.target.value }))}
                    className="mt-1 h-8 text-sm" />
                </div>
              </div>

              {/* DTC codes */}
              <div>
                <Label className="text-xs">{t("dtcCodes")}</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={dtcInput} onChange={(e) => setDtcInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDtc(); } }}
                    placeholder="P0171, C1234" className="flex-1 h-8 text-sm uppercase" />
                  <Button size="sm" variant="outline" onClick={addDtc} className="h-8">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {form.dtcCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.dtcCodes.map((code) => (
                      <span key={code} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono font-medium text-emerald-800">
                        {code}
                        <button onClick={() => removeDtc(code)} className="text-emerald-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Symptom */}
              <div>
                <Label className="text-xs">{t("symptomDescription")}</Label>
                <Textarea value={form.symptomDescription} onChange={(e) => setForm((p) => ({ ...p, symptomDescription: e.target.value }))}
                  rows={3} className="mt-1 text-sm" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />{tc("delete")}
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); if (detail) resetForm(detail); }}>{tc("cancel")}</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    {tc("save")}
                  </Button>
                </div>
              </div>
            </>
          ) : hasData ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {detail.vehicleModel && <><dt className="text-muted-foreground">{t("vehicleModel")}</dt><dd className="font-medium">{detail.vehicleModel}</dd></>}
              {detail.manufacturedAt && <><dt className="text-muted-foreground">{t("manufacturedAt")}</dt><dd className="font-medium">{new Date(detail.manufacturedAt).toLocaleDateString(undefined, { year: "numeric", month: "2-digit" })}</dd></>}
              {detail.vehicleVin && <><dt className="text-muted-foreground">VIN</dt><dd className="font-medium font-mono text-xs">{detail.vehicleVin}</dd></>}
              {detail.usageMonths != null && <><dt className="text-muted-foreground">{t("usageMonths")}</dt><dd className="font-medium">{detail.usageMonths}개월</dd></>}
              {detail.extraData?.soldAt && <><dt className="text-muted-foreground">{t("soldAt")}</dt><dd className="font-medium">{new Date(detail.extraData.soldAt).toLocaleDateString()}</dd></>}
              {detail.extraData?.repairedAt && <><dt className="text-muted-foreground">{t("repairedAt")}</dt><dd className="font-medium">{new Date(detail.extraData.repairedAt).toLocaleDateString()}</dd></>}
              {detail.mileageKm && <><dt className="text-muted-foreground">{t("mileageKm")}</dt><dd className="font-medium">{Number(detail.mileageKm).toLocaleString()} km</dd></>}
              {detail.extraData?.incidentLocationType && <><dt className="text-muted-foreground">{t("incidentLocationType")}</dt><dd className="font-medium">{t(`incidentLocationTypes.${detail.extraData.incidentLocationType}` as Parameters<typeof t>[0])}</dd></>}
              {detail.region && <><dt className="text-muted-foreground">{t("region")}</dt><dd className="font-medium">{detail.region}</dd></>}
              {detail.dealerName && <><dt className="text-muted-foreground">{t("dealer")}</dt><dd className="font-medium">{detail.dealerName}</dd></>}
              {detail.dtcCodes && detail.dtcCodes.length > 0 && (
                <>
                  <dt className="text-muted-foreground">{t("dtcCodes")}</dt>
                  <dd className="flex flex-wrap gap-1">
                    {detail.dtcCodes.map((code) => (
                      <span key={code} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono font-medium text-emerald-800">{code}</span>
                    ))}
                  </dd>
                </>
              )}
              {detail.symptomDescription && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">{t("symptomDescription")}</dt>
                  <dd className="font-medium mt-0.5 whitespace-pre-wrap">{detail.symptomDescription}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">{tc("noData")}</p>
          )}
        </div>
      )}
    </div>
  );
}
