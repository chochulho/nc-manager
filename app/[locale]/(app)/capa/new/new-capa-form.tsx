"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { WriteGuidePanel } from "@/components/write-guide-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NcItem { id: string; ncNumber: string; title: string }
interface ComplaintItem { id: string; complaintNumber: string; title: string }

interface Props {
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceNumber: string;
  ncList: NcItem[];
  complaintList: ComplaintItem[];
}

export function NewCAPAForm({ sourceType: initSourceType, sourceId: initSourceId, sourceLabel, ncList, complaintList }: Props) {
  const t = useTranslations("capa");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    methodology: "8d",
    problemStatement: "",
    sourceType: initSourceType || "other",
    sourceId: initSourceId || "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.sourceType || !form.sourceId) {
      toast.error("제목, 출처 유형, 출처 ID는 필수입니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/nc/capa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "등록에 실패했습니다."); return; }
      toast.success(`${data.capaNumber} 등록 완료`);
      router.push(`/capa/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/capa"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">{t("newForm")}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{t("basicInfo")}</h2>
              <div>
                <Label>{t("title")} *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                  placeholder={t("title")}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("methodology")}</Label>
                  <Select value={form.methodology} onValueChange={(v) => set("methodology", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8d">{t("methodologies.8d")}</SelectItem>
                      <SelectItem value="simple_capa">{t("methodologies.simple_capa")}</SelectItem>
                      <SelectItem value="a3">{t("methodologies.a3")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("problemStatement")}</Label>
                <Textarea
                  value={form.problemStatement}
                  onChange={(e) => set("problemStatement", e.target.value)}
                  placeholder={t("problemStatement")}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">{t("sourceInfo")}</h2>
              <div>
                <Label>{t("sourceType")} *</Label>
                <Select value={form.sourceType} onValueChange={(v) => setForm((prev) => ({ ...prev, sourceType: v, sourceId: "" }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal_nc">{t("sourceTypes.internal_nc")}</SelectItem>
                    <SelectItem value="customer_complaint">{t("sourceTypes.customer_complaint")}</SelectItem>
                    <SelectItem value="audit">{t("sourceTypes.audit")}</SelectItem>
                    <SelectItem value="change">{t("sourceTypes.change")}</SelectItem>
                    <SelectItem value="gauge">{t("sourceTypes.gauge")}</SelectItem>
                    <SelectItem value="other">{t("sourceTypes.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("source")} *</Label>
                {sourceLabel ? (
                  <div className="mt-1 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 font-medium">
                    {sourceLabel}
                    <input type="hidden" value={form.sourceId} />
                  </div>
                ) : form.sourceType === "internal_nc" ? (
                  <Select value={form.sourceId} onValueChange={(v) => set("sourceId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t("selectNc")} /></SelectTrigger>
                    <SelectContent>
                      {ncList.map((nc) => (
                        <SelectItem key={nc.id} value={nc.id}>[{nc.ncNumber}] {nc.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : form.sourceType === "customer_complaint" ? (
                  <Select value={form.sourceId} onValueChange={(v) => set("sourceId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t("selectComplaint")} /></SelectTrigger>
                    <SelectContent>
                      {complaintList.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>[{cc.complaintNumber}] {cc.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.sourceId}
                    onChange={(e) => set("sourceId", e.target.value)}
                    placeholder={t("sourceId")}
                    className="mt-1"
                  />
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? tc("saving") : t("registerButton")}
            </Button>
          </div>
        </div>
      </form>
      </div>
      <WriteGuidePanel type="capa" className="mt-[4.5rem]" />
    </div>
  );
}
