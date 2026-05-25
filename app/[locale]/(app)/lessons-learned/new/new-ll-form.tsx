"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Save, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WriteGuidePanel } from "@/components/write-guide-panel";

interface NCOption {
  id: string;
  ncNumber: string;
  title: string;
  description: string | null;
  severity: string;
}

interface ComplaintOption {
  id: string;
  complaintNumber: string;
  title: string;
  description: string | null;
  severity: string;
  customerName: string | null;
}

interface Props {
  ncs: NCOption[];
  complaints: ComplaintOption[];
}

export function NewLLForm({ ncs, complaints }: Props) {
  const t = useTranslations("ll");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [includeNc, setIncludeNc] = useState(false);
  const [includeComplaint, setIncludeComplaint] = useState(true);
  const [selectedNcId, setSelectedNcId] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState("");

  const [form, setForm] = useState({
    title: "",
    problemSummary: "",
    rootCause: "",
    actionsTaken: "",
    keyLearning: "",
    preventionMeasures: "",
    applicableAreas: "",
    tagsRaw: "",
    status: "draft" as "draft" | "review" | "published",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAutoDraft() {
    const nc = ncs.find((n) => n.id === selectedNcId);
    const complaint = complaints.find((c) => c.id === selectedComplaintId);

    let title = "";
    let problemSummary = "";
    let rootCause = "";
    let actionsTaken = "";

    if (nc && includeNc) {
      title = title || nc.title;
      problemSummary = `[NC ${nc.ncNumber}] ${nc.title}`;
      if (nc.description) problemSummary += `\n\n${nc.description}`;
    }

    if (complaint && includeComplaint) {
      const prefix = `[${complaint.complaintNumber}${complaint.customerName ? ` / ${complaint.customerName}` : ""}] ${complaint.title}`;
      if (problemSummary) {
        problemSummary = problemSummary + `\n\n${prefix}`;
      } else {
        title = title || complaint.title;
        problemSummary = prefix;
        if (complaint.description) problemSummary += `\n\n${complaint.description}`;
      }
    }

    if (!title && !problemSummary) {
      toast.warning(tc("select"));
      return;
    }

    setForm((prev) => ({
      ...prev,
      title: prev.title || title,
      problemSummary: prev.problemSummary || problemSummary,
      rootCause: prev.rootCause || rootCause,
      actionsTaken: prev.actionsTaken || actionsTaken,
    }));
    toast.success(tc("success"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(tc("required"));
      return;
    }

    const tags = form.tagsRaw
      ? form.tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    setLoading(true);
    try {
      const res = await fetch("/api/nc/lessons-learned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          sourceInternalNcId: includeNc && selectedNcId ? selectedNcId : null,
          sourceComplaintId: includeComplaint && selectedComplaintId ? selectedComplaintId : null,
          problemSummary: form.problemSummary || null,
          rootCause: form.rootCause || null,
          actionsTaken: form.actionsTaken || null,
          keyLearning: form.keyLearning || null,
          preventionMeasures: form.preventionMeasures || null,
          applicableAreas: form.applicableAreas || null,
          tags: tags.length ? tags : null,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? tc("error"));
        return;
      }
      toast.success(`${data.llNumber} ${tc("success")}`);
      router.push(`/lessons-learned/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  const canAutoDraft =
    (includeNc && selectedNcId) || (includeComplaint && selectedComplaintId);

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <Link href="/lessons-learned">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="page-title flex items-center gap-2">
              <Lightbulb className="h-5 w-5" style={{ color: "#F26B3A" }} />
              {t("newForm")}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source links */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: "#2B4B8C" }}>
              {t("sourceSection")}
            </h2>
            <div className="space-y-4">
              {/* Internal NC */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeNc}
                    onChange={(e) => {
                      setIncludeNc(e.target.checked);
                      if (!e.target.checked) setSelectedNcId("");
                    }}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{t("sourceNcCheck")}</span>
                </label>
                {includeNc && (
                  <div className="mt-2 ml-6">
                    <Select value={selectedNcId} onValueChange={setSelectedNcId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={tc("select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ncs.map((nc) => (
                          <SelectItem key={nc.id} value={nc.id}>
                            <span className="font-mono text-xs mr-2" style={{ color: "#2B4B8C" }}>
                              {nc.ncNumber}
                            </span>
                            {nc.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Customer complaint */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeComplaint}
                    onChange={(e) => {
                      setIncludeComplaint(e.target.checked);
                      if (!e.target.checked) setSelectedComplaintId("");
                    }}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{t("sourceComplaintCheck")}</span>
                </label>
                {includeComplaint && (
                  <div className="mt-2 ml-6">
                    <Select value={selectedComplaintId} onValueChange={setSelectedComplaintId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={tc("select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {complaints.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-mono text-xs mr-2" style={{ color: "#F26B3A" }}>
                              {c.complaintNumber}
                            </span>
                            {c.customerName && (
                              <span className="text-xs text-gray-500 mr-1">[{c.customerName}]</span>
                            )}
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Auto-draft button */}
              {canAutoDraft && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoDraft}
                  className="gap-2"
                  style={{ borderColor: "#2B4B8C", color: "#2B4B8C" }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: "#F26B3A" }} />
                  {t("autoDraft")}
                </Button>
              )}
            </div>
          </div>

          {/* Body section */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold" style={{ color: "#2B4B8C" }}>{t("bodySection")}</h2>

            <div>
              <Label htmlFor="ll-title">{tc("title")} *</Label>
              <Input
                id="ll-title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder={tc("title")}
                required
              />
            </div>

            <div>
              <Label htmlFor="ll-problem">{t("problemSummary")}</Label>
              <Textarea
                id="ll-problem"
                value={form.problemSummary}
                onChange={(e) => setField("problemSummary", e.target.value)}
                placeholder={t("problemSummary")}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="ll-rootcause">{t("rootCause")}</Label>
              <Textarea
                id="ll-rootcause"
                value={form.rootCause}
                onChange={(e) => setField("rootCause", e.target.value)}
                placeholder={t("rootCause")}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="ll-actions">{t("actionsTaken")}</Label>
              <Textarea
                id="ll-actions"
                value={form.actionsTaken}
                onChange={(e) => setField("actionsTaken", e.target.value)}
                placeholder={t("actionsTaken")}
                rows={3}
              />
            </div>

            {/* Key learning — highlighted style */}
            <div>
              <Label htmlFor="ll-key" className="flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" style={{ color: "#F26B3A" }} />
                {t("keyLearning")}
              </Label>
              <Textarea
                id="ll-key"
                value={form.keyLearning}
                onChange={(e) => setField("keyLearning", e.target.value)}
                placeholder={t("keyLearning")}
                rows={2}
                className="border-2 focus:ring-0"
                style={{ borderColor: "#2B4B8C", borderRadius: "0.75rem" }}
              />
            </div>

            <div>
              <Label htmlFor="ll-prevention">{t("preventionMeasures")}</Label>
              <Textarea
                id="ll-prevention"
                value={form.preventionMeasures}
                onChange={(e) => setField("preventionMeasures", e.target.value)}
                placeholder={t("preventionMeasures")}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ll-areas">{t("applicableAreas")}</Label>
                <Input
                  id="ll-areas"
                  value={form.applicableAreas}
                  onChange={(e) => setField("applicableAreas", e.target.value)}
                  placeholder={t("applicableAreas")}
                />
              </div>
              <div>
                <Label htmlFor="ll-tags">{t("tags")}</Label>
                <Input
                  id="ll-tags"
                  value={form.tagsRaw}
                  onChange={(e) => setField("tagsRaw", e.target.value)}
                  placeholder={t("tags")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ll-status">{t("status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v as typeof form.status)}
              >
                <SelectTrigger id="ll-status" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("statuses.draft")}</SelectItem>
                  <SelectItem value="review">{t("statuses.review")}</SelectItem>
                  <SelectItem value="published">{t("statuses.published")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pb-8">
            <Link href="/lessons-learned">
              <Button variant="outline" type="button">{tc("cancel")}</Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
              style={{ background: "#2B4B8C" }}
            >
              <Save className="h-4 w-4" />
              {loading ? tc("saving") : t("new")}
            </Button>
          </div>
        </form>
      </div>

      <WriteGuidePanel type="lessons_learned" className="mt-[4.5rem]" />
    </div>
  );
}
