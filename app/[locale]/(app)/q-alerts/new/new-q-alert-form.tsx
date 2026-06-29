"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { Link } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Prefill {
  title?: string;
  problemSummary?: string;
  rootCause?: string;
  prevention?: string;
  sourceType?: string;
  sourceId?: string;
  sourceNumber?: string;
}

export function NewQAlertForm({ prefill }: { prefill: Prefill }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: prefill.title ?? "",
    problemSummary: prefill.problemSummary ?? "",
    rootCause: prefill.rootCause ?? "",
    prevention: prefill.prevention ?? "",
    targetProcess: "",
    sourceType: prefill.sourceType ?? "",
    sourceId: prefill.sourceId ?? "",
    sourceNumber: prefill.sourceNumber ?? "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { toast.error("제목은 필수입니다."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/nc/q-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          problemSummary: form.problemSummary || null,
          rootCause: form.rootCause || null,
          prevention: form.prevention || null,
          targetProcess: form.targetProcess || null,
          sourceType: form.sourceType || null,
          sourceId: form.sourceId || null,
          sourceNumber: form.sourceNumber || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "오류가 발생했습니다."); return; }
      toast.success(`${data.alertNumber} 등록됐습니다.`);
      router.push(`/q-alerts/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  const isFromSource = !!prefill.sourceNumber;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/q-alerts">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Q-Alert 등록
          </h1>
        </div>
      </div>

      {isFromSource && (
        <div className="mb-4 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
          <span className="font-semibold">{prefill.sourceNumber}</span>에서 자동 초안이 생성됐습니다. 내용을 검토 후 저장하세요.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <Label>제목 *</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} required className="mt-1" placeholder="Q-Alert 제목" />
        </div>

        <div>
          <Label>대상 공정 / 라인</Label>
          <Input value={form.targetProcess} onChange={(e) => set("targetProcess", e.target.value)} className="mt-1" placeholder="예: 조립 1라인, 도장공정 전체" />
        </div>

        <div className="border-l-4 border-red-400 pl-3">
          <Label className="text-red-600 font-bold">문제 요약</Label>
          <Textarea value={form.problemSummary} onChange={(e) => set("problemSummary", e.target.value)}
            rows={3} placeholder="무엇이, 어디서, 얼마나 발생했는지" className="mt-1 text-sm" />
        </div>

        <div className="border-l-4 border-orange-400 pl-3">
          <Label className="text-orange-600 font-bold">근본 원인</Label>
          <Textarea value={form.rootCause} onChange={(e) => set("rootCause", e.target.value)}
            rows={3} placeholder="왜 이 문제가 발생했는지" className="mt-1 text-sm" />
        </div>

        <div className="border-l-4 border-green-400 pl-3">
          <Label className="text-green-600 font-bold">재발방지 조치</Label>
          <Textarea value={form.prevention} onChange={(e) => set("prevention", e.target.value)}
            rows={3} placeholder="현장에서 확인할 포인트, 취해진 조치" className="mt-1 text-sm" />
        </div>

        {isFromSource && (
          <div className="text-xs text-muted-foreground pt-1">
            출처: {prefill.sourceNumber}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/q-alerts">
            <Button type="button" variant="outline">취소</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-1" />
            {loading ? "저장 중..." : "초안으로 저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}
