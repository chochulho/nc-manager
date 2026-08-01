"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Paperclip, X } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { WriteGuidePanel } from "@/components/write-guide-panel";

interface Option { id: string; name: string; code?: string; number?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }

interface Props {
  sites: Option[];
  processes: Option[];
  parts: Array<{ id: string; name: string; number: string }>;
  suppliers: Option[];
  categoriesL2: CategoryL2[];
  defaultSiteId?: string | null;
}

export function NewPartNCForm({ sites, processes, parts, suppliers, categoriesL2, defaultSiteId }: Props) {
  const t = useTranslations("partNc");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [discoveredLocationType, setDiscoveredLocationType] = useState<"site" | "supplier">("site");

  const [form, setForm] = useState({
    title: "",
    description: "",
    discoveredAt: new Date().toISOString().slice(0, 10),
    discoveryStage: "",
    severity: "",
    occurrenceSiteId: defaultSiteId ?? "",
    discoveredBySiteId: "",
    discoveredByProcessId: "",
    occurrenceSupplierId: "",
    partId: "",
    lotNumber: "",
    quantityInspected: "",
    quantityNc: "",
    categoryL2Id: "",
    safetyRelated: false,
    regulatoryRelated: false,
    capaRequired: false,
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const images: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] || "png";
            images.push(new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type }));
          }
        }
      }
      if (images.length > 0) {
        e.preventDefault();
        setPendingFiles((prev) => [...prev, ...images]);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/nc/part-nc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? tc("error"));
        return;
      }

      if (pendingFiles.length > 0) {
        let uploaded = 0;
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "part_nc");
          fd.append("entityId", data.id);
          const r = await fetch("/api/nc/attachments", { method: "POST", body: fd });
          if (r.ok) uploaded++;
        }
        toast.success(tc("registeredSuccessAttachments", { number: data.pncNumber, count: uploaded }));
      } else {
        toast.success(tc("registeredSuccess", { number: data.pncNumber }));
      }

      router.push(`/part-nc/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/part-nc">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="page-title">{t("newForm")}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* 기본 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{t("basicInfo")}</h2>

              {sites.length > 0 && (
                <div>
                  <Label>{t("site")}</Label>
                  <Select value={form.occurrenceSiteId} onValueChange={(v: string) => set("occurrenceSiteId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={tc("select")} /></SelectTrigger>
                    <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="title">{tc("title")} *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                  placeholder={t("title")}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("discoveredAt")} *</Label>
                  <Input
                    type="date"
                    value={form.discoveredAt}
                    onChange={(e) => set("discoveredAt", e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("discoveryStage")} *</Label>
                  <Select value={form.discoveryStage} onValueChange={(v: string) => set("discoveryStage", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">{t("stages.incoming")}</SelectItem>
                      <SelectItem value="in_process">{t("stages.in_process")}</SelectItem>
                      <SelectItem value="outgoing">{t("stages.outgoing")}</SelectItem>
                      <SelectItem value="internal_audit">{t("stages.internal_audit")}</SelectItem>
                      <SelectItem value="msa">{t("stages.msa")}</SelectItem>
                      <SelectItem value="other">{t("stages.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("severity")} *</Label>
                  <Select value={form.severity} onValueChange={(v: string) => set("severity", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">{t("severities.critical")}</SelectItem>
                      <SelectItem value="major">{t("severities.major")}</SelectItem>
                      <SelectItem value="minor">{t("severities.minor")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("category")}</Label>
                  <Select value={form.categoryL2Id} onValueChange={(v: string) => set("categoryL2Id", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesL2.map((c) => (
                        <SelectItem key={c.id} value={c.id}>[{c.code}] {c.nameKo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t("description")}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder={t("description")}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 대상 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{tc("targetInfo")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("part")}</Label>
                  <Select value={form.partId} onValueChange={(v: string) => set("partId", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{tc("lotNumber")}</Label>
                  <Input
                    value={form.lotNumber}
                    onChange={(e) => set("lotNumber", e.target.value)}
                    placeholder="LOT-XXXXXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("quantityInspected")}</Label>
                  <Input
                    type="number"
                    value={form.quantityInspected}
                    onChange={(e) => set("quantityInspected", e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("quantityNc")}</Label>
                  <Input
                    type="number"
                    value={form.quantityNc}
                    onChange={(e) => set("quantityNc", e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 사이드 */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{t("occurrenceLocation")}</h2>
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
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>{t("supplier")}</Label>
                  <Select value={form.occurrenceSupplierId} onValueChange={(v: string) => set("occurrenceSupplierId", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>{t("discoveredByProcess")}</Label>
                <Select value={form.discoveredByProcessId} onValueChange={(v: string) => set("discoveredByProcessId", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={tc("select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="section-title">{tc("attributes")}</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.safetyRelated} onChange={(e) => set("safetyRelated", e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">{tc("safetyRelated")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.regulatoryRelated} onChange={(e) => set("regulatoryRelated", e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">{t("regulatoryRelated")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.capaRequired} onChange={(e) => set("capaRequired", e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">{t("capaRequired")}</span>
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
              <p className="text-xs text-muted-foreground text-center">{tc("pasteHint")}</p>
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.some((f) => f.type.startsWith("image/")) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {pendingFiles.map((f, i) => f.type.startsWith("image/") ? (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] px-1.5 py-1 truncate">
                            {f.name}
                          </div>
                        </div>
                      ) : null)}
                    </div>
                  )}
                  {pendingFiles.some((f) => !f.type.startsWith("image/")) && (
                    <div className="space-y-1">
                      {pendingFiles.map((f, i) => !f.type.startsWith("image/") ? (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 text-sm">
                          <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)}KB` : `${(f.size / 1024 / 1024).toFixed(1)}MB`}
                          </span>
                          <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                            <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      ) : null)}
                    </div>
                  )}
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
      <WriteGuidePanel type="part_nc" className="mt-[4.5rem]" />
    </div>
  );
}
