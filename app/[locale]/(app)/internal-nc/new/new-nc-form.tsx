"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { WriteGuidePanel } from "@/components/write-guide-panel";

interface Option { id: string; name: string; code?: string; number?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }

interface Props {
  sites: Option[];
  processes: Option[];
  parts: Array<{ id: string; name: string; number: string }>;
  suppliers: Option[];
  categoriesL2: CategoryL2[];
}

const DISCOVERY_STAGES = [
  { value: "incoming", label: "입고검사" },
  { value: "in_process", label: "공정 중" },
  { value: "outgoing", label: "출하검사" },
  { value: "internal_audit", label: "내부감사" },
  { value: "msa", label: "MSA" },
  { value: "other", label: "기타" },
];

const SEVERITIES = [
  { value: "critical", label: "긴급 (Critical)" },
  { value: "major", label: "주요 (Major)" },
  { value: "minor", label: "경미 (Minor)" },
];

export function NewNCForm({ sites, processes, parts, suppliers, categoriesL2 }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    discoveredAt: new Date().toISOString().slice(0, 10),
    discoveryStage: "",
    severity: "",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/nc/internal-nc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "등록에 실패했습니다.");
        return;
      }

      // 선택된 파일 업로드
      if (pendingFiles.length > 0) {
        let uploaded = 0;
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "internal_nc");
          fd.append("entityId", data.id);
          const r = await fetch("/api/nc/attachments", { method: "POST", body: fd });
          if (r.ok) uploaded++;
        }
        toast.success(`${data.ncNumber} 등록 완료 (첨부 ${uploaded}개)`);
      } else {
        toast.success(`${data.ncNumber} 등록 완료`);
      }

      router.push(`/internal-nc/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/internal-nc">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="page-title">내부 부적합 신규 등록</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 기본 정보 */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">기본 정보</h2>

              <div>
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                  placeholder="부적합 제목을 간략히 입력하세요"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>발견일 *</Label>
                  <Input
                    type="date"
                    value={form.discoveredAt}
                    onChange={(e) => set("discoveredAt", e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>발견 단계 *</Label>
                  <Select value={form.discoveryStage} onValueChange={(v: string) => set("discoveryStage", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOVERY_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>심각도 *</Label>
                  <Select value={form.severity} onValueChange={(v: string) => set("severity", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>분류 (L2)</Label>
                  <Select value={form.categoryL2Id} onValueChange={(v: string) => set("categoryL2Id", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="선택" />
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
                <Label>내용</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="부적합 상세 내용을 입력하세요"
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 대상 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">대상 정보</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>부품</Label>
                  <Select value={form.partId} onValueChange={(v: string) => set("partId", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>LOT 번호</Label>
                  <Input
                    value={form.lotNumber}
                    onChange={(e) => set("lotNumber", e.target.value)}
                    placeholder="LOT-XXXXXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>검사 수량</Label>
                  <Input
                    type="number"
                    value={form.quantityInspected}
                    onChange={(e) => set("quantityInspected", e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>부적합 수량</Label>
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
              <h2 className="section-title">발생 위치</h2>
              <div>
                <Label>발견 사업장</Label>
                <Select value={form.discoveredBySiteId} onValueChange={(v: string) => set("discoveredBySiteId", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>발견 공정</Label>
                <Select value={form.discoveredByProcessId} onValueChange={(v: string) => set("discoveredByProcessId", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.discoveryStage === "incoming" && (
                <div>
                  <Label>공급자</Label>
                  <Select value={form.occurrenceSupplierId} onValueChange={(v: string) => set("occurrenceSupplierId", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="section-title">속성</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.safetyRelated}
                  onChange={(e) => set("safetyRelated", e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium">안전 관련 (Safety)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.regulatoryRelated}
                  onChange={(e) => set("regulatoryRelated", e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium">법규 관련 (Regulatory)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.capaRequired}
                  onChange={(e) => set("capaRequired", e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium">CAPA 필요</span>
              </label>
            </div>

            {/* 파일 첨부 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="section-title flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                첨부파일 (등록 시 함께 업로드)
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
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  }}
                />
                <Paperclip className="h-5 w-5 mx-auto mb-1.5 text-gray-400" />
                <p className="text-sm text-muted-foreground">클릭하거나 파일을 끌어다 놓으세요</p>
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
              {loading ? "저장 중..." : "등록하기"}
            </Button>
          </div>
        </div>
      </form>
      </div>
      <WriteGuidePanel type="internal_nc" className="mt-[4.5rem]" />
    </div>
  );
}
