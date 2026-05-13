"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Edit2, X, Clock, AlertCircle, ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";
import { AttachmentSection } from "@/components/nc/attachment-section";
import { NotificationSection } from "@/components/nc/notification-section";
import { AnalysisReportSection } from "@/components/nc/analysis-report-section";

interface Option { id: string; name: string; code?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }
interface Complaint {
  id: string; complaintNumber: string; title: string; customerDescription: string | null;
  customerId: string; customerSiteName: string | null; customerReference: string | null;
  receivedAt: Date; receivedChannel: string; isFormal: boolean;
  discoveryStage: string; severity: string; status: string;
  partId: string | null; lotNumber: string | null;
  quantityClaimed: string | null; quantityConfirmed: string | null;
  categoryL2Id: string | null; safetyRelated: boolean; recallRisk: boolean;
  capaId: string | null;
  initialResponseDueAt: Date | null; initialResponseSentAt: Date | null;
  containmentDueAt: Date | null; containedAt: Date | null;
  finalReportDueAt: Date | null; finalReportSentAt: Date | null;
  resolutionType: string | null;
  costRecallReturn: string | null; costPenalty: string | null; costOther: string | null;
  createdAt: Date;
}

interface LinkedCapa { id: string; capaNumber: string; status: string }

interface Props {
  complaint: Complaint;
  customers: Option[];
  parts: Array<{ id: string; name: string; number: string }>;
  categoriesL2: CategoryL2[];
  linkedCapa: LinkedCapa | null;
}

const STATUS_LABELS: Record<string, string> = {
  received: "접수", acknowledged: "인지", contained: "봉쇄", investigating: "조사 중",
  "8d_in_progress": "8D 진행", final_reported: "최종보고", closed: "종결", closed_ntf: "종결(NTF)",
};
const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-50 text-blue-700", acknowledged: "bg-indigo-50 text-indigo-700",
  contained: "bg-yellow-50 text-yellow-700", investigating: "bg-orange-50 text-orange-700",
  "8d_in_progress": "bg-purple-50 text-purple-700", final_reported: "bg-teal-50 text-teal-700",
  closed: "bg-green-50 text-green-700", closed_ntf: "bg-gray-100 text-gray-600",
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800", major: "bg-orange-100 text-orange-800", minor: "bg-yellow-100 text-yellow-800",
};
const SEVERITY_LABELS: Record<string, string> = { critical: "긴급", major: "주요", minor: "경미" };
const CHANNEL_LABELS: Record<string, string> = { portal: "포털", email: "이메일", phone: "전화", meeting: "미팅", informal: "비공식" };
const STAGE_LABELS: Record<string, string> = { inline_0km: "Inline/0km", field: "필드", warranty: "보증", other: "기타" };
const RESOLUTION_TYPES = [
  { value: "confirmed_nc", label: "실제 부적합 (Confirmed NC)" },
  { value: "ntf", label: "이상없음 (NTF)" },
  { value: "customer_misuse", label: "고객 과실" },
  { value: "partial", label: "부분 인정" },
];

function SlaIndicator({ label, due, sent }: { label: string; due: Date | null; sent: Date | null }) {
  if (!due) return null;
  const overdue = !sent && new Date() > new Date(due);
  const done = !!sent;
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${done ? "bg-green-50" : overdue ? "bg-red-50" : "bg-gray-50"}`}>
      <span className={`font-medium ${done ? "text-green-700" : overdue ? "text-red-700" : "text-gray-700"}`}>{label}</span>
      <div className="text-right">
        {done ? (
          <span className="text-green-600">완료 {new Date(sent!).toLocaleDateString("ko-KR")}</span>
        ) : (
          <span className={overdue ? "text-red-600 font-semibold flex items-center gap-1" : "text-gray-500"}>
            {overdue && <Clock className="h-3 w-3" />}
            {new Date(due).toLocaleDateString("ko-KR")}
          </span>
        )}
      </div>
    </div>
  );
}

export function ComplaintDetailClient({ complaint, customers, parts, categoriesL2, linkedCapa }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: complaint.title,
    customerDescription: complaint.customerDescription ?? "",
    status: complaint.status,
    severity: complaint.severity,
    customerId: complaint.customerId,
    customerSiteName: complaint.customerSiteName ?? "",
    customerReference: complaint.customerReference ?? "",
    partId: complaint.partId ?? "",
    lotNumber: complaint.lotNumber ?? "",
    quantityClaimed: complaint.quantityClaimed ?? "",
    quantityConfirmed: complaint.quantityConfirmed ?? "",
    categoryL2Id: complaint.categoryL2Id ?? "",
    safetyRelated: complaint.safetyRelated,
    recallRisk: complaint.recallRisk,
    resolutionType: complaint.resolutionType ?? "",
    initialResponseSentAt: complaint.initialResponseSentAt ? new Date(complaint.initialResponseSentAt).toISOString().slice(0, 10) : "",
    containedAt: complaint.containedAt ? new Date(complaint.containedAt).toISOString().slice(0, 10) : "",
    finalReportSentAt: complaint.finalReportSentAt ? new Date(complaint.finalReportSentAt).toISOString().slice(0, 10) : "",
    costRecallReturn: complaint.costRecallReturn ?? "",
    costPenalty: complaint.costPenalty ?? "",
    costOther: complaint.costOther ?? "",
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/complaints/${complaint.id}`, {
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

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
  const partMap = Object.fromEntries(parts.map(p => [p.id, `${p.number} — ${p.name}`]));
  const catMap = Object.fromEntries(categoriesL2.map(c => [c.id, `[${c.code}] ${c.nameKo}`]));

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/complaints"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">{complaint.complaintNumber}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[complaint.status] ?? ""}`}>{STATUS_LABELS[complaint.status] ?? complaint.status}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLORS[complaint.severity] ?? ""}`}>{SEVERITY_LABELS[complaint.severity] ?? complaint.severity}</span>
              {complaint.safetyRelated && <AlertCircle className="h-4 w-4 text-red-600" />}
              {complaint.recallRisk && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">RECALL</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{complaint.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={handleSave} size="sm" disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "저장 중..." : "저장"}</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" />취소</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 mr-1" />편집</Button>
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
                <div><Label>제목</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>상태</Label>
                    <Select value={form.status} onValueChange={(v: string) => set("status", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>해결 유형</Label>
                    <Select value={form.resolutionType} onValueChange={(v: string) => set("resolutionType", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{RESOLUTION_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>부품</Label>
                    <Select value={form.partId} onValueChange={(v: string) => set("partId", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>LOT 번호</Label><Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} className="mt-1" /></div>
                  <div><Label>클레임 수량</Label><Input type="number" value={form.quantityClaimed} onChange={(e) => set("quantityClaimed", e.target.value)} className="mt-1" /></div>
                  <div><Label>확인 수량</Label><Input type="number" value={form.quantityConfirmed} onChange={(e) => set("quantityConfirmed", e.target.value)} className="mt-1" /></div>
                </div>
                <div><Label>고객 설명</Label><Textarea value={form.customerDescription} onChange={(e) => set("customerDescription", e.target.value)} rows={4} className="mt-1" /></div>
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">수신일</dt><dd className="font-medium mt-0.5">{new Date(complaint.receivedAt).toLocaleDateString("ko-KR")}</dd></div>
                <div><dt className="text-muted-foreground">수신 채널</dt><dd className="font-medium mt-0.5">{CHANNEL_LABELS[complaint.receivedChannel] ?? complaint.receivedChannel}</dd></div>
                <div><dt className="text-muted-foreground">발생 단계</dt><dd className="font-medium mt-0.5">{STAGE_LABELS[complaint.discoveryStage] ?? complaint.discoveryStage}</dd></div>
                <div><dt className="text-muted-foreground">공식 여부</dt><dd className="font-medium mt-0.5">{complaint.isFormal ? "공식" : "비공식"}</dd></div>
                <div><dt className="text-muted-foreground">부품</dt><dd className="font-medium mt-0.5">{complaint.partId ? partMap[complaint.partId] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">분류</dt><dd className="font-medium mt-0.5">{complaint.categoryL2Id ? catMap[complaint.categoryL2Id] ?? "-" : "-"}</dd></div>
                <div><dt className="text-muted-foreground">클레임 수량</dt><dd className="font-medium mt-0.5">{complaint.quantityClaimed ?? "-"}</dd></div>
                <div><dt className="text-muted-foreground">확인 수량</dt><dd className="font-medium mt-0.5">{complaint.quantityConfirmed ?? "-"}</dd></div>
                {complaint.customerDescription && (
                  <div className="col-span-2"><dt className="text-muted-foreground">고객 설명</dt><dd className="font-medium mt-0.5 whitespace-pre-wrap">{complaint.customerDescription}</dd></div>
                )}
              </dl>
            )}
          </div>

          {/* 대응 진행 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">대응 진행 (Response Tracking)</h2>
            {editing ? (
              <div className="grid grid-cols-3 gap-4">
                <div><Label>초도 대응 완료일</Label><Input type="date" value={form.initialResponseSentAt} onChange={(e) => set("initialResponseSentAt", e.target.value)} className="mt-1" /></div>
                <div><Label>봉쇄조치 완료일</Label><Input type="date" value={form.containedAt} onChange={(e) => set("containedAt", e.target.value)} className="mt-1" /></div>
                <div><Label>최종보고 발송일</Label><Input type="date" value={form.finalReportSentAt} onChange={(e) => set("finalReportSentAt", e.target.value)} className="mt-1" /></div>
              </div>
            ) : (
              <div className="space-y-2">
                <SlaIndicator label="초도 대응" due={complaint.initialResponseDueAt} sent={complaint.initialResponseSentAt} />
                <SlaIndicator label="봉쇄조치" due={complaint.containmentDueAt} sent={complaint.containedAt} />
                <SlaIndicator label="최종보고" due={complaint.finalReportDueAt} sent={complaint.finalReportSentAt} />
              </div>
            )}
          </div>

          {/* COPQ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">비용 (COPQ)</h2>
            {editing ? (
              <div className="grid grid-cols-3 gap-4">
                <div><Label>리콜/반환 (KRW)</Label><Input type="number" value={form.costRecallReturn} onChange={(e) => set("costRecallReturn", e.target.value)} placeholder="0" className="mt-1" /></div>
                <div><Label>페널티 (KRW)</Label><Input type="number" value={form.costPenalty} onChange={(e) => set("costPenalty", e.target.value)} placeholder="0" className="mt-1" /></div>
                <div><Label>기타 (KRW)</Label><Input type="number" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} placeholder="0" className="mt-1" /></div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">COPQ 합계</dt><dd className="font-medium mt-0.5 text-lg">{(Number(complaint.costRecallReturn ?? 0) + Number(complaint.costPenalty ?? 0) + Number(complaint.costOther ?? 0)).toLocaleString("ko-KR")} 원</dd></div>
                {complaint.resolutionType && <div><dt className="text-muted-foreground">해결 유형</dt><dd className="font-medium mt-0.5">{RESOLUTION_TYPES.find(r => r.value === complaint.resolutionType)?.label ?? complaint.resolutionType}</dd></div>}
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
                <Link href={`/capa/new?sourceType=customer_complaint&sourceId=${complaint.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-3.5 w-3.5 mr-1" /> CAPA 생성
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <AnalysisReportSection
            complaintId={complaint.id}
            capaId={complaint.capaId}
            complaintInfo={{
              complaintNumber: complaint.complaintNumber,
              title: complaint.title,
              customerName: customers.find((c) => c.id === complaint.customerId)?.name ?? "-",
              partName: complaint.partId ? (parts.find((p) => p.id === complaint.partId)?.name ?? "-") : "-",
              receivedAt: complaint.receivedAt,
              severity: complaint.severity,
              resolutionType: complaint.resolutionType,
            }}
            onComplaintClosed={() => router.refresh()}
          />
          <NotificationSection entityType="customer_complaint" entityId={complaint.id} />
          <AttachmentSection entityType="customer_complaint" entityId={complaint.id} />
        </div>

        {/* 사이드 */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">고객사</h2>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>고객사</Label>
                  <Select value={form.customerId} onValueChange={(v: string) => set("customerId", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>고객사 공장명</Label><Input value={form.customerSiteName} onChange={(e) => set("customerSiteName", e.target.value)} className="mt-1" /></div>
                <div><Label>고객사 참조번호</Label><Input value={form.customerReference} onChange={(e) => set("customerReference", e.target.value)} className="mt-1" /></div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-muted-foreground">고객사</dt><dd className="font-medium mt-0.5">{customerMap[complaint.customerId] ?? "-"}</dd></div>
                {complaint.customerSiteName && <div><dt className="text-muted-foreground">공장명</dt><dd className="font-medium mt-0.5">{complaint.customerSiteName}</dd></div>}
                {complaint.customerReference && <div><dt className="text-muted-foreground">참조번호</dt><dd className="font-medium mt-0.5 font-mono text-xs">{complaint.customerReference}</dd></div>}
              </dl>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title">속성</h2>
            {editing ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.safetyRelated} onChange={(e) => set("safetyRelated", e.target.checked)} className="h-4 w-4 rounded" />
                  <span className="text-sm font-medium">안전 관련 (Safety)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.recallRisk} onChange={(e) => set("recallRisk", e.target.checked)} className="h-4 w-4 rounded" />
                  <span className="text-sm font-medium text-red-600">리콜 위험 (Recall Risk)</span>
                </label>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {complaint.safetyRelated && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">Safety</span>}
                {complaint.recallRisk && <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold">Recall Risk</span>}
                {!complaint.safetyRelated && !complaint.recallRisk && <span className="text-sm text-muted-foreground">없음</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
