"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import Link from "next/link";
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 소스 연결 상태
  const [includeNc, setIncludeNc] = useState(false);
  const [includeComplaint, setIncludeComplaint] = useState(true);
  const [selectedNcId, setSelectedNcId] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState("");

  // 폼 필드
  const [form, setForm] = useState({
    title: "",
    problemSummary: "",
    rootCause: "",
    actionsTaken: "",
    keyLearning: "",
    preventionMeasures: "",
    applicableAreas: "",
    tagsRaw: "", // comma-separated
    status: "draft" as "draft" | "review" | "published",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // 자동 초안 생성
  function handleAutoDraft() {
    const nc = ncs.find((n) => n.id === selectedNcId);
    const complaint = complaints.find((c) => c.id === selectedComplaintId);

    let title = "";
    let problemSummary = "";
    let rootCause = "";
    let actionsTaken = "";

    if (nc && includeNc) {
      title = title || nc.title;
      problemSummary = `[내부 부적합 ${nc.ncNumber}] ${nc.title}`;
      if (nc.description) problemSummary += `\n\n${nc.description}`;
    }

    if (complaint && includeComplaint) {
      const prefix = `[고객 클레임 ${complaint.complaintNumber}${complaint.customerName ? ` / ${complaint.customerName}` : ""}] ${complaint.title}`;
      if (problemSummary) {
        problemSummary = problemSummary + `\n\n${prefix}`;
      } else {
        title = title || complaint.title;
        problemSummary = prefix;
        if (complaint.description) problemSummary += `\n\n${complaint.description}`;
      }
    }

    if (!title && !problemSummary) {
      toast.warning("소스를 선택한 후 자동 초안을 생성하세요.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      title: prev.title || title,
      problemSummary: prev.problemSummary || problemSummary,
      rootCause: prev.rootCause || rootCause,
      actionsTaken: prev.actionsTaken || actionsTaken,
    }));
    toast.success("초안이 자동으로 채워졌습니다. 검토 후 수정하세요.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("제목을 입력하세요.");
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
        toast.error(data.error ?? "등록에 실패했습니다.");
        return;
      }
      toast.success(`${data.llNumber} 등록 완료`);
      router.push(`/lessons-learned/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  const canAutoDraft =
    (includeNc && selectedNcId) || (includeComplaint && selectedComplaintId);

  return (
    <div className="flex gap-4 items-start">
      {/* 메인 폼 */}
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
              레슨런 신규 등록
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── 소스 연결 섹션 ───────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: "#2B4B8C" }}>
              소스 연결
            </h2>
            <div className="space-y-4">
              {/* 내부 부적합 */}
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
                  <span className="text-sm font-medium text-gray-700">내부 부적합에서 가져오기</span>
                  <span className="text-xs text-gray-400">(선택)</span>
                </label>
                {includeNc && (
                  <div className="mt-2 ml-6">
                    <Select value={selectedNcId} onValueChange={setSelectedNcId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="내부 부적합 선택..." />
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

              {/* 고객 클레임 */}
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
                  <span className="text-sm font-medium text-gray-700">고객 클레임에서 가져오기</span>
                  <span className="text-xs text-gray-400">(기본 선택)</span>
                </label>
                {includeComplaint && (
                  <div className="mt-2 ml-6">
                    <Select value={selectedComplaintId} onValueChange={setSelectedComplaintId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="고객 클레임 선택..." />
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

              {/* 자동 초안 버튼 */}
              {canAutoDraft && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoDraft}
                  className="gap-2"
                  style={{ borderColor: "#2B4B8C", color: "#2B4B8C" }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: "#F26B3A" }} />
                  자동 초안 생성
                </Button>
              )}
            </div>
          </div>

          {/* ── 본문 섹션 ────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold" style={{ color: "#2B4B8C" }}>레슨런 내용</h2>

            <div>
              <Label htmlFor="ll-title">제목 *</Label>
              <Input
                id="ll-title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="예: 입고검사 샘플링 부족으로 인한 치수 불량 유출"
                required
              />
            </div>

            <div>
              <Label htmlFor="ll-problem">문제 요약</Label>
              <Textarea
                id="ll-problem"
                value={form.problemSummary}
                onChange={(e) => setField("problemSummary", e.target.value)}
                placeholder="어떤 문제가 발생했는지 간략히 기술"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="ll-rootcause">근본 원인</Label>
              <Textarea
                id="ll-rootcause"
                value={form.rootCause}
                onChange={(e) => setField("rootCause", e.target.value)}
                placeholder="5Why 분석 결과 등 핵심 원인"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="ll-actions">취해진 조치</Label>
              <Textarea
                id="ll-actions"
                value={form.actionsTaken}
                onChange={(e) => setField("actionsTaken", e.target.value)}
                placeholder="봉쇄조치, 시정조치, CAPA 내용 요약"
                rows={3}
              />
            </div>

            {/* 핵심 레슨 — 강조 스타일 */}
            <div>
              <Label htmlFor="ll-key" className="flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" style={{ color: "#F26B3A" }} />
                핵심 레슨 <span className="text-xs text-gray-400 ml-1">(가장 중요한 한 줄)</span>
              </Label>
              <Textarea
                id="ll-key"
                value={form.keyLearning}
                onChange={(e) => setField("keyLearning", e.target.value)}
                placeholder="다음번에 ○○을 하면 △△ 문제를 예방할 수 있다."
                rows={2}
                className="border-2 focus:ring-0"
                style={{ borderColor: "#2B4B8C", borderRadius: "0.75rem" }}
              />
            </div>

            <div>
              <Label htmlFor="ll-prevention">예방 조치</Label>
              <Textarea
                id="ll-prevention"
                value={form.preventionMeasures}
                onChange={(e) => setField("preventionMeasures", e.target.value)}
                placeholder="유사 문제 재발 방지를 위해 도입/변경한 조치"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ll-areas">적용 공정/부서</Label>
                <Input
                  id="ll-areas"
                  value={form.applicableAreas}
                  onChange={(e) => setField("applicableAreas", e.target.value)}
                  placeholder="예: 입고검사팀, 품질팀"
                />
              </div>
              <div>
                <Label htmlFor="ll-tags">태그 <span className="text-xs text-gray-400">(쉼표 구분)</span></Label>
                <Input
                  id="ll-tags"
                  value={form.tagsRaw}
                  onChange={(e) => setField("tagsRaw", e.target.value)}
                  placeholder="예: 치수불량, 입고검사, A고객"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ll-status">상태</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v as typeof form.status)}
              >
                <SelectTrigger id="ll-status" className="w-40">
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

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-3 pb-8">
            <Link href="/lessons-learned">
              <Button variant="outline" type="button">취소</Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
              style={{ background: "#2B4B8C" }}
            >
              <Save className="h-4 w-4" />
              {loading ? "저장 중..." : "레슨런 등록"}
            </Button>
          </div>
        </form>
      </div>

      {/* 가이드 패널 */}
      <WriteGuidePanel type="lessons_learned" className="mt-[4.5rem]" />
    </div>
  );
}
