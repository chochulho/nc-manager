"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Paperclip, X, Plus, MapPin } from "lucide-react";
import Link from "next/link";
import { WriteGuidePanel } from "@/components/write-guide-panel";

interface Option { id: string; name: string; code?: string }
interface CategoryL2 { id: string; code: string; nameKo: string }

interface Props {
  customers: Option[];
  parts: Array<{ id: string; name: string; number: string }>;
  categoriesL2: CategoryL2[];
}

const RECEIVED_CHANNELS = [
  { value: "portal", label: "포털" },
  { value: "email", label: "이메일" },
  { value: "phone", label: "전화" },
  { value: "meeting", label: "미팅" },
  { value: "informal", label: "비공식" },
];

const DISCOVERY_STAGES = [
  { value: "inline_0km", label: "Inline/0km" },
  { value: "field", label: "필드" },
  { value: "warranty", label: "보증" },
  { value: "other", label: "기타" },
];

const SEVERITIES = [
  { value: "critical", label: "긴급 (Critical)" },
  { value: "major", label: "주요 (Major)" },
  { value: "minor", label: "경미 (Minor)" },
];

export function NewComplaintForm({ customers, parts, categoriesL2 }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dtcInput, setDtcInput] = useState("");
  const [fieldClaim, setFieldClaim] = useState({
    vehicleModel: "", vehicleVin: "", manufacturedAt: "",
    region: "", dealerName: "", mileageKm: "",
    usageMonths: "", symptomDescription: "", dtcCodes: [] as string[],
  });
  const [form, setForm] = useState({
    title: "",
    customerDescription: "",
    customerId: "",
    customerSiteName: "",
    customerReference: "",
    receivedAt: new Date().toISOString().slice(0, 10),
    receivedChannel: "",
    isFormal: true,
    discoveryStage: "",
    severity: "",
    partId: "",
    lotNumber: "",
    quantityClaimed: "",
    categoryL2Id: "",
    safetyRelated: false,
    recallRisk: false,
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setFc(key: string, value: string) {
    setFieldClaim((prev) => ({ ...prev, [key]: value }));
  }

  function addDtc() {
    const val = dtcInput.trim().toUpperCase();
    if (!val) return;
    if (fieldClaim.dtcCodes.includes(val)) return;
    setFieldClaim((prev) => ({ ...prev, dtcCodes: [...prev.dtcCodes, val] }));
    setDtcInput("");
  }

  function removeDtc(code: string) {
    setFieldClaim((prev) => ({ ...prev, dtcCodes: prev.dtcCodes.filter((c) => c !== code) }));
  }

  const isFieldClaim = form.discoveryStage === "field" || form.discoveryStage === "warranty";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = isFieldClaim
        ? { ...form, fieldClaim: { ...fieldClaim, usageMonths: fieldClaim.usageMonths !== "" ? parseInt(fieldClaim.usageMonths) : null, manufacturedAt: fieldClaim.manufacturedAt ? `${fieldClaim.manufacturedAt}-01` : null } }
        : form;

      const res = await fetch("/api/nc/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "등록에 실패했습니다."); return; }

      if (pendingFiles.length > 0) {
        let uploaded = 0;
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "customer_complaint");
          fd.append("entityId", data.id);
          const r = await fetch("/api/nc/attachments", { method: "POST", body: fd });
          if (r.ok) uploaded++;
        }
        toast.success(`${data.complaintNumber} 등록 완료 (첨부 ${uploaded}개)`);
      } else {
        toast.success(`${data.complaintNumber} 등록 완료`);
      }

      router.push(`/complaints/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/complaints"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">고객 클레임 신규 등록</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* 기본 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">기본 정보</h2>
              <div>
                <Label>제목 *</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="클레임 제목을 간략히 입력하세요" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>수신일 *</Label>
                  <Input type="date" value={form.receivedAt} onChange={(e) => set("receivedAt", e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>수신 채널 *</Label>
                  <Select value={form.receivedChannel} onValueChange={(v: string) => set("receivedChannel", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>{RECEIVED_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>발생 단계 *</Label>
                  <Select value={form.discoveryStage} onValueChange={(v: string) => set("discoveryStage", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>{DISCOVERY_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>심각도 *</Label>
                  <Select value={form.severity} onValueChange={(v: string) => set("severity", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>분류 (L2)</Label>
                  <Select value={form.categoryL2Id} onValueChange={(v: string) => set("categoryL2Id", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>{categoriesL2.map(c => <SelectItem key={c.id} value={c.id}>[{c.code}] {c.nameKo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>공식 클레임 여부</Label>
                  <Select value={form.isFormal ? "true" : "false"} onValueChange={(v: string) => set("isFormal", v === "true")}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">공식 (Formal)</SelectItem>
                      <SelectItem value="false">비공식 (Informal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>고객 설명</Label>
                <Textarea value={form.customerDescription} onChange={(e) => set("customerDescription", e.target.value)} placeholder="고객이 제시한 불만 내용" rows={4} className="mt-1" />
              </div>
            </div>

            {/* 대상 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">대상 정보</h2>
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
                  <Label>클레임 수량</Label>
                  <Input type="number" value={form.quantityClaimed} onChange={(e) => set("quantityClaimed", e.target.value)} placeholder="0" className="mt-1" />
                </div>
              </div>
            </div>

            {/* 필드 클레임 정보 (field / warranty 일 때만) */}
            {isFieldClaim && (
              <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-4">
                <h2 className="section-title flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  필드 클레임 정보
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>차종</Label>
                    <Input value={fieldClaim.vehicleModel} onChange={(e) => setFc("vehicleModel", e.target.value)} placeholder="예: G90, Tucson" className="mt-1" />
                  </div>
                  <div>
                    <Label>제조년월</Label>
                    <Input type="month" value={fieldClaim.manufacturedAt} onChange={(e) => setFc("manufacturedAt", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>VIN</Label>
                    <Input value={fieldClaim.vehicleVin} onChange={(e) => setFc("vehicleVin", e.target.value)} placeholder="차량 식별번호" className="mt-1" />
                  </div>
                  <div>
                    <Label>사용기간 (개월)</Label>
                    <Input type="number" value={fieldClaim.usageMonths} onChange={(e) => setFc("usageMonths", e.target.value)} placeholder="예: 24" className="mt-1" />
                  </div>
                  <div>
                    <Label>발생 지역</Label>
                    <Input value={fieldClaim.region} onChange={(e) => setFc("region", e.target.value)} placeholder="예: 서울, 경기, 미국 서부" className="mt-1" />
                  </div>
                  <div>
                    <Label>딜러 / 사업소</Label>
                    <Input value={fieldClaim.dealerName} onChange={(e) => setFc("dealerName", e.target.value)} placeholder="예: 현대 강남 서비스센터" className="mt-1" />
                  </div>
                  <div>
                    <Label>주행거리 (km)</Label>
                    <Input type="number" value={fieldClaim.mileageKm} onChange={(e) => setFc("mileageKm", e.target.value)} placeholder="예: 35000" className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label>불량코드 (DTC)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={dtcInput} onChange={(e) => setDtcInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDtc(); } }}
                      placeholder="예: P0171, C1234" className="flex-1 uppercase" />
                    <Button type="button" variant="outline" size="sm" onClick={addDtc} className="h-9 px-3">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {fieldClaim.dtcCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {fieldClaim.dtcCodes.map((code) => (
                        <span key={code} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono font-medium text-emerald-800">
                          {code}
                          <button type="button" onClick={() => removeDtc(code)} className="text-emerald-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>고객 증상 기술</Label>
                  <Textarea value={fieldClaim.symptomDescription} onChange={(e) => setFc("symptomDescription", e.target.value)}
                    placeholder="고객이 보고한 증상을 그대로 기재하세요." rows={3} className="mt-1" />
                </div>
              </div>
            )}
          </div>

          {/* 사이드 */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="section-title">고객사 정보</h2>
              <div>
                <Label>고객사 *</Label>
                <Select value={form.customerId} onValueChange={(v: string) => set("customerId", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>고객사 공장명</Label>
                <Input value={form.customerSiteName} onChange={(e) => set("customerSiteName", e.target.value)} placeholder="예: 화성공장" className="mt-1" />
              </div>
              <div>
                <Label>고객사 참조번호</Label>
                <Input value={form.customerReference} onChange={(e) => set("customerReference", e.target.value)} placeholder="고객사 내부 관리번호" className="mt-1" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="section-title">속성</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.safetyRelated} onChange={(e) => set("safetyRelated", e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">안전 관련 (Safety)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.recallRisk} onChange={(e) => set("recallRisk", e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium text-red-600">리콜 위험 (Recall Risk)</span>
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
                <input type="file" multiple className="hidden"
                  onChange={(e) => { if (e.target.files) setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]); }} />
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
      <WriteGuidePanel type="complaint" className="mt-[4.5rem]" />
    </div>
  );
}
