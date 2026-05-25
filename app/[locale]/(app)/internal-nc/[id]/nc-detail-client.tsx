"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Edit2, X, ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";
import { AttachmentSection } from "@/components/nc/attachment-section";
import { NotificationSection } from "@/components/nc/notification-section";
import { WriteGuidePanel } from "@/components/write-guide-panel";

interface Option { id: string; name: string; code?: string; number?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }

interface NC {
  id: string; ncNumber: string; title: string; description: string | null;
  discoveredAt: Date; discoveryStage: string; severity: string; status: string;
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
  nc: NC;
  sites: Option[]; processes: Option[]; parts: Array<{ id: string; name: string; number: string }>;
  suppliers: Option[]; categoriesL2: CategoryL2[];
  linkedCapa: LinkedCapa | null;
}

const DISCOVERY_STAGES: Record<string, string> = {
  incoming: "입고검사", in_process: "공정 중", outgoing: "출하검사",
  internal_audit: "내부감사", msa: "MSA", other: "기타",
};
const SEVERITIES: Record<string, string> = { critical: "긴급", major: "주요", minor: "경미" };
const STATUSES: Record<string, string> = {
  open: "Open", contained: "봉쇄 완료", disposition_decided: "처분 결정",
  capa_in_progress: "CAPA 진행", closed: "종결",
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-50 text-red-700", contained: "bg-orange-50 text-orange-700",
  disposition_decided: "bg-yellow-50 text-yellow-700",
  capa_in_progress: "bg-blue-50 text-blue-700", closed: "bg-green-50 text-green-700",
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800", major: "bg-orange-100 text-orange-800", minor: "bg-yellow-100 text-yellow-800",
};
const DISPOSITION_TYPES = [
  { value: "rework", label: "재작업 (Rework)" },
  { value: "deviation", label: "특채 (Deviation)" },
  { value: "scrap", label: "폐기 (Scrap)" },
  { value: "return_to_supplier", label: "공급자 반환" },
  { value: "use_as_is", label: "그대로 사용" },
];

export function NCDetailClient({ nc, sites, processes, parts, suppliers, categoriesL2, linkedCapa }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: nc.title,
    description: nc.description ?? "",
    discoveredAt: nc.discoveredAt ? new Date(nc.discoveredAt).toISOString().slice(0, 10) : "",
    discoveryStage: nc.discoveryStage,
    severity: nc.severity,
    status: nc.status,
    discoveredBySiteId: nc.discoveredBySiteId ?? "",
    discoveredByProcessId: nc.discoveredByProcessId ?? "",
    occurrenceSupplierId: nc.occurrenceSupplierId ?? "",
    partId: nc.partId ?? "",
    lotNumber: nc.lotNumber ?? "",
    quantityInspected: nc.quantityInspected ?? "",
    quantityNc: nc.quantityNc ?? "",
    categoryL2Id: nc.categoryL2Id ?? "",
    safetyRelated: nc.safetyRelated,
    regulatoryRelated: nc.regulatoryRelated,
    capaRequired: nc.capaRequired,
    dispositionType: nc.dispositionType ?? "",
    dispositionNotes: nc.dispositionNotes ?? "",
    costScrap: nc.costScrap ?? "",
    costRework: nc.costRework ?? "",
    costOther: nc.costOther ?? "",
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/internal-nc/${nc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { toast.error("저장에 실패했습니다."); return; }
      toast.success("저장됐습니다.");
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

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/internal-nc"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">{nc.ncNumber}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[nc.status] ?? ""}`}>
                {STATUSES[nc.status] ?? nc.status}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLORS[nc.severity] ?? ""}`}>
                {SEVERITIES[nc.severity] ?? nc.severity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{nc.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={handleSave} size="sm" disabled={saving}>
                <Save className="h-4 w-4 mr-1" />{saving ? "저장 중..." : "저장"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" />취소
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" />편집
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">기본 정보</h2>
            {editing ? (
              <>
                <div>
                  <Label>제목 *</Label>
                  <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>발견일</Label>
                    <Input type="date" value={form.discoveredAt} onChange={(e) => set("discoveredAt", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>발견 단계</Label>
                    <Select value={form.discoveryStage} onValueChange={(v: string) => set("discoveryStage", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DISCOVERY_STAGES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>심각도</Label>
                    <Select value={form.severity} onValueChange={(v: string) => set("severity", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SEVERITIES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>상태</Label>
                    <Select value={form.status} onValueChange={(v: string) => set("status", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUSES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>분류 (L2)</Label>
                    <Select value={form.categoryL2Id} onValueChange={(v: string) => set("categoryL2Id", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        {categoriesL2.map(c => <SelectItem key={c.id} value={c.id}>[{c.code}] {c.nameKo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>내용</Label>
                  <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className="mt-1" />
                </div>
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">발견일</dt><dd className="font-medium mt-0.5">{new Date(nc.discoveredAt).toLocaleDateString("ko-KR")}</dd></div>
                <div><dt className="text-muted-foreground">발견 단계</dt><dd className="font-medium mt-0.5">{DISCOVERY_STAGES[nc.discoveryStage] ?? nc.discoveryStage}</dd></div>
                <div><dt className="text-muted-foreground">분류</dt><dd className="font-medium mt-0.5">{nc.categoryL2Id ? catMap[nc.categoryL2Id] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">등록일</dt><dd className="font-medium mt-0.5">{new Date(nc.createdAt).toLocaleDateString("ko-KR")}</dd></div>
                {nc.description && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">내용</dt>
                    <dd className="font-medium mt-0.5 whitespace-pre-wrap">{nc.description}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* 대상 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">대상 정보</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>부품</Label>
                  <Select value={form.partId} onValueChange={(v: string) => set("partId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>LOT 번호</Label>
                  <Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} placeholder="LOT-XXXXXX" className="mt-1" />
                </div>
                <div>
                  <Label>검사 수량</Label>
                  <Input type="number" value={form.quantityInspected} onChange={(e) => set("quantityInspected", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>부적합 수량</Label>
                  <Input type="number" value={form.quantityNc} onChange={(e) => set("quantityNc", e.target.value)} className="mt-1" />
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">부품</dt><dd className="font-medium mt-0.5">{nc.partId ? partMap[nc.partId] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">LOT 번호</dt><dd className="font-medium mt-0.5">{nc.lotNumber ?? "-"}</dd></div>
                <div><dt className="text-muted-foreground">검사 수량</dt><dd className="font-medium mt-0.5">{nc.quantityInspected ?? "-"}</dd></div>
                <div><dt className="text-muted-foreground">부적합 수량</dt><dd className="font-medium mt-0.5">{nc.quantityNc ?? "-"}</dd></div>
              </dl>
            )}
          </div>

          {/* 처분 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">처분 (Disposition)</h2>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>처분 유형</Label>
                  <Select value={form.dispositionType} onValueChange={(v: string) => set("dispositionType", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {DISPOSITION_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>처분 메모</Label>
                  <Textarea value={form.dispositionNotes} onChange={(e) => set("dispositionNotes", e.target.value)} rows={3} className="mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>폐기 비용 (KRW)</Label><Input type="number" value={form.costScrap} onChange={(e) => set("costScrap", e.target.value)} placeholder="0" className="mt-1" /></div>
                  <div><Label>재작업 비용 (KRW)</Label><Input type="number" value={form.costRework} onChange={(e) => set("costRework", e.target.value)} placeholder="0" className="mt-1" /></div>
                  <div><Label>기타 비용 (KRW)</Label><Input type="number" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} placeholder="0" className="mt-1" /></div>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">처분 유형</dt><dd className="font-medium mt-0.5">{DISPOSITION_TYPES.find(d => d.value === nc.dispositionType)?.label ?? "-"}</dd></div>
                <div>
                  <dt className="text-muted-foreground">COPQ 합계</dt>
                  <dd className="font-medium mt-0.5">
                    {(Number(nc.costScrap ?? 0) + Number(nc.costRework ?? 0) + Number(nc.costOther ?? 0)).toLocaleString("ko-KR")} 원
                  </dd>
                </div>
                {nc.dispositionNotes && (
                  <div className="col-span-2"><dt className="text-muted-foreground">처분 메모</dt><dd className="font-medium mt-0.5 whitespace-pre-wrap">{nc.dispositionNotes}</dd></div>
                )}
              </dl>
            )}
          </div>

          {/* CAPA 연결 */}
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
                    {linkedCapa.status === "open" ? "접수" : linkedCapa.status === "in_progress" ? "진행 중"
                      : linkedCapa.status === "actions_implemented" ? "조치 완료"
                      : linkedCapa.status === "effectiveness_monitoring" ? "유효성 확인"
                      : linkedCapa.status === "closed" ? "종결" : linkedCapa.status}
                  </p>
                </div>
                <Link href={`/capa/${linkedCapa.id}`}>
                  <Button variant="outline" size="sm">CAPA 보기</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">연결된 CAPA가 없습니다.</p>
                <Link href={`/capa/new?sourceType=internal_nc&sourceId=${nc.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-3.5 w-3.5 mr-1" /> CAPA 생성
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <NotificationSection entityType="internal_nc" entityId={nc.id} />
          <AttachmentSection entityType="internal_nc" entityId={nc.id} />
        </div>

        {/* 사이드 */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">발생 위치</h2>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>발견 사업장</Label>
                  <Select value={form.discoveredBySiteId} onValueChange={(v: string) => set("discoveredBySiteId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>발견 공정</Label>
                  <Select value={form.discoveredByProcessId} onValueChange={(v: string) => set("discoveredByProcessId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.discoveryStage === "incoming" && (
                  <div>
                    <Label>공급자</Label>
                    <Select value={form.occurrenceSupplierId} onValueChange={(v: string) => set("occurrenceSupplierId", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-muted-foreground">발견 사업장</dt><dd className="font-medium mt-0.5">{nc.discoveredBySiteId ? siteMap[nc.discoveredBySiteId] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">발견 공정</dt><dd className="font-medium mt-0.5">{nc.discoveredByProcessId ? processMap[nc.discoveredByProcessId] ?? "-" : "-"}</dd></div>
                {nc.occurrenceSupplierId && <div><dt className="text-muted-foreground">공급자</dt><dd className="font-medium mt-0.5">{supplierMap[nc.occurrenceSupplierId] ?? "-"}</dd></div>}
              </dl>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title">속성</h2>
            {editing ? (
              <div className="space-y-2">
                {[
                  { key: "safetyRelated", label: "안전 관련 (Safety)" },
                  { key: "regulatoryRelated", label: "법규 관련 (Regulatory)" },
                  { key: "capaRequired", label: "CAPA 필요" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                      onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nc.safetyRelated && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">Safety</span>}
                {nc.regulatoryRelated && <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">Regulatory</span>}
                {nc.capaRequired && <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">CAPA 필요</span>}
                {!nc.safetyRelated && !nc.regulatoryRelated && !nc.capaRequired && <span className="text-sm text-muted-foreground">없음</span>}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      <WriteGuidePanel type="internal_nc" className="mt-[4.5rem]" />
    </div>
  );
}
