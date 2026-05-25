"use client";

import { useState } from "react";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Save, X, Lightbulb, ExternalLink, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WriteGuidePanel } from "@/components/write-guide-panel";
import { formatDate, cn } from "@/lib/utils";

interface LLItem {
  id: string;
  llNumber: string;
  title: string;
  sourceInternalNcId: string | null;
  sourceComplaintId: string | null;
  problemSummary: string | null;
  rootCause: string | null;
  actionsTaken: string | null;
  keyLearning: string | null;
  preventionMeasures: string | null;
  applicableAreas: string | null;
  tags: string[] | null;
  status: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  ncNumber: string | null;
  ncTitle: string | null;
  ncSeverity: string | null;
  complaintNumber: string | null;
  complaintTitle: string | null;
  complaintSeverity: string | null;
  customerName: string | null;
}

const statusConfig: Record<string, { label: string; cls: string; next: string | null; nextLabel: string | null }> = {
  draft:     { label: "초안",    cls: "bg-gray-100 text-gray-700",     next: "review",    nextLabel: "검토 요청" },
  review:    { label: "검토 중", cls: "bg-yellow-50 text-yellow-800",  next: "published", nextLabel: "발행" },
  published: { label: "발행됨",  cls: "bg-green-50 text-green-800",    next: null,        nextLabel: null },
};

export function LLDetailClient({ item }: { item: LLItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: item.title,
    problemSummary: item.problemSummary ?? "",
    rootCause: item.rootCause ?? "",
    actionsTaken: item.actionsTaken ?? "",
    keyLearning: item.keyLearning ?? "",
    preventionMeasures: item.preventionMeasures ?? "",
    applicableAreas: item.applicableAreas ?? "",
    tagsRaw: item.tags?.join(", ") ?? "",
    status: item.status as "draft" | "review" | "published",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const tags = form.tagsRaw
      ? form.tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    setSaving(true);
    try {
      const res = await fetch(`/api/nc/lessons-learned/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
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
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "저장 실패");
        return;
      }
      toast.success("저장되었습니다.");
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusAdvance() {
    const st = statusConfig[item.status];
    if (!st.next) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/lessons-learned/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: st.next }),
      });
      if (!res.ok) { toast.error("상태 변경 실패"); return; }
      toast.success(`상태가 "${statusConfig[st.next]?.label}"(으)로 변경되었습니다.`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 레슨런을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/nc/lessons-learned/${item.id}`, { method: "DELETE" });
      toast.success("삭제되었습니다.");
      router.push("/lessons-learned");
    } finally {
      setDeleting(false);
    }
  }

  const st = statusConfig[item.status] ?? statusConfig.draft;

  return (
    <div className="flex gap-4 items-start">
      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {/* 헤더 */}
        <div className="page-header">
          <div className="flex items-center gap-3">
            <Link href="/lessons-learned">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold" style={{ color: "#2B4B8C" }}>
                  {item.llNumber}
                </span>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", st.cls)}>
                  {st.label}
                </span>
              </div>
              <h1 className="text-xl font-bold mt-0.5" style={{ color: "#1A1F2E" }}>{item.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {st.next && (
              <Button
                onClick={handleStatusAdvance}
                disabled={saving}
                size="sm"
                style={{ background: "#2B4B8C" }}
              >
                {st.nextLabel}
              </Button>
            )}
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> 수정
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ background: "#2B4B8C" }}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? "저장 중..." : "저장"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5 mr-1" /> 취소
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* 소스 링크 */}
        {(item.ncNumber || item.complaintNumber) && (
          <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3 mb-5 flex flex-wrap gap-4">
            {item.ncNumber && (
              <Link
                href={`/internal-nc/${item.sourceInternalNcId}`}
                className="flex items-center gap-1.5 text-sm hover:underline font-medium"
                style={{ color: "#2B4B8C" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                내부 부적합 {item.ncNumber}
                {item.ncTitle && <span className="text-gray-500 font-normal">— {item.ncTitle}</span>}
              </Link>
            )}
            {item.complaintNumber && (
              <Link
                href={`/complaints/${item.sourceComplaintId}`}
                className="flex items-center gap-1.5 text-sm hover:underline font-medium"
                style={{ color: "#F26B3A" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                고객 클레임 {item.complaintNumber}
                {item.customerName && <span className="text-gray-500 font-normal">— {item.customerName}</span>}
              </Link>
            )}
          </div>
        )}

        {/* 본문 */}
        {editing ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <div>
              <Label>제목</Label>
              <Input value={form.title} onChange={(e) => setField("title", e.target.value)} />
            </div>
            <div>
              <Label>문제 요약</Label>
              <Textarea value={form.problemSummary} onChange={(e) => setField("problemSummary", e.target.value)} rows={3} />
            </div>
            <div>
              <Label>근본 원인</Label>
              <Textarea value={form.rootCause} onChange={(e) => setField("rootCause", e.target.value)} rows={3} />
            </div>
            <div>
              <Label>취해진 조치</Label>
              <Textarea value={form.actionsTaken} onChange={(e) => setField("actionsTaken", e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" style={{ color: "#F26B3A" }} /> 핵심 레슨
              </Label>
              <Textarea
                value={form.keyLearning}
                onChange={(e) => setField("keyLearning", e.target.value)}
                rows={2}
                className="border-2"
                style={{ borderColor: "#2B4B8C", borderRadius: "0.75rem" }}
              />
            </div>
            <div>
              <Label>예방 조치</Label>
              <Textarea value={form.preventionMeasures} onChange={(e) => setField("preventionMeasures", e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>적용 공정/부서</Label>
                <Input value={form.applicableAreas} onChange={(e) => setField("applicableAreas", e.target.value)} />
              </div>
              <div>
                <Label>태그 (쉼표 구분)</Label>
                <Input value={form.tagsRaw} onChange={(e) => setField("tagsRaw", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>상태</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v as typeof form.status)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">초안</SelectItem>
                  <SelectItem value="review">검토 중</SelectItem>
                  <SelectItem value="published">발행됨</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 핵심 레슨 강조 카드 */}
            {item.keyLearning && (
              <div
                className="rounded-xl border-2 p-4"
                style={{ borderColor: "#2B4B8C", background: "linear-gradient(135deg, #f0f4fb 0%, #fff 100%)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4" style={{ color: "#F26B3A" }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2B4B8C" }}>
                    핵심 레슨
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 leading-relaxed">{item.keyLearning}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "문제 요약",     value: item.problemSummary },
                { label: "근본 원인",     value: item.rootCause },
                { label: "취해진 조치",   value: item.actionsTaken },
                { label: "예방 조치",     value: item.preventionMeasures },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{value}</p>
                  </div>
                ) : null
              )}
            </div>

            {/* 메타 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {item.applicableAreas && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-0.5">적용 공정/부서</span>
                    <span className="text-gray-800">{item.applicableAreas}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500 block mb-0.5">등록일</span>
                  <span className="text-gray-800">{formatDate(item.createdAt)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-0.5">최종 수정</span>
                  <span className="text-gray-800">{formatDate(item.updatedAt)}</span>
                </div>
              </div>
              {item.tags && item.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 가이드 패널 */}
      <WriteGuidePanel type="lessons_learned" className="mt-[4.5rem]" />
    </div>
  );
}
