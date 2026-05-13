"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, Plus, X, Edit2, Save, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FieldDetail {
  id: string;
  vehicleModel: string | null;
  vehicleVin: string | null;
  manufacturedAt: string | null;
  region: string | null;
  dealerName: string | null;
  mileageKm: string | null;
  usageMonths: number | null;
  dtcCodes: string[] | null;
  symptomDescription: string | null;
}

interface Props {
  complaintId: string;
}

export function FieldClaimDetailSection({ complaintId }: Props) {
  const [detail, setDetail] = useState<FieldDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [dtcInput, setDtcInput] = useState("");
  const [form, setForm] = useState({
    vehicleModel: "", vehicleVin: "", manufacturedAt: "",
    region: "", dealerName: "", mileageKm: "",
    usageMonths: "", symptomDescription: "", dtcCodes: [] as string[],
  });

  async function load() {
    const res = await fetch(`/api/nc/field-claim-details?complaintId=${complaintId}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
      if (data) resetForm(data);
    }
    setLoading(false);
  }

  function resetForm(d: FieldDetail) {
    setForm({
      vehicleModel: d.vehicleModel ?? "",
      vehicleVin: d.vehicleVin ?? "",
      manufacturedAt: d.manufacturedAt ? new Date(d.manufacturedAt).toISOString().slice(0, 7) : "",
      region: d.region ?? "",
      dealerName: d.dealerName ?? "",
      mileageKm: d.mileageKm ?? "",
      usageMonths: d.usageMonths != null ? String(d.usageMonths) : "",
      symptomDescription: d.symptomDescription ?? "",
      dtcCodes: d.dtcCodes ?? [],
    });
  }

  useEffect(() => { load(); }, [complaintId]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/nc/field-claim-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });
      if (!res.ok) { toast.error("생성에 실패했습니다."); return; }
      const data = await res.json();
      setDetail(data);
      resetForm(data);
      setEditing(true);
      setExpanded(true);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/field-claim-details/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          usageMonths: form.usageMonths !== "" ? parseInt(form.usageMonths) : null,
          manufacturedAt: form.manufacturedAt ? `${form.manufacturedAt}-01` : null,
        }),
      });
      if (!res.ok) { toast.error("저장에 실패했습니다."); return; }
      const updated = await res.json();
      setDetail(updated);
      resetForm(updated);
      setEditing(false);
      toast.success("저장됐습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    if (!confirm("필드 클레임 정보를 삭제하시겠습니까?")) return;
    await fetch(`/api/nc/field-claim-details/${detail.id}`, { method: "DELETE" });
    setDetail(null);
    setEditing(false);
    toast.success("삭제됐습니다.");
  }

  function addDtc() {
    const val = dtcInput.trim().toUpperCase();
    if (!val) return;
    if (form.dtcCodes.includes(val)) { toast.error("이미 추가된 코드입니다."); return; }
    setForm((p) => ({ ...p, dtcCodes: [...p.dtcCodes, val] }));
    setDtcInput("");
  }

  function removeDtc(code: string) {
    setForm((p) => ({ ...p, dtcCodes: p.dtcCodes.filter((c) => c !== code) }));
  }

  if (loading) return null;

  const hasData = detail && (
    detail.vehicleModel || detail.region || detail.dealerName ||
    detail.mileageKm || detail.dtcCodes?.length || detail.usageMonths != null
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          필드 클레임 정보
        </h2>
        {detail ? (
          <div className="flex items-center gap-1.5">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => { setEditing(true); setExpanded(true); }}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />편집
              </Button>
            )}
            <button onClick={() => setExpanded((v) => !v)} className="p-1 text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            정보 입력
          </Button>
        )}
      </div>

      {detail && expanded && (
        <div className="space-y-4">
          {editing ? (
            <>
              {/* 차량 정보 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">차종</Label>
                  <Input value={form.vehicleModel} onChange={(e) => setForm((p) => ({ ...p, vehicleModel: e.target.value }))}
                    placeholder="예: G90, Tucson" className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">제조년월</Label>
                  <Input type="month" value={form.manufacturedAt} onChange={(e) => setForm((p) => ({ ...p, manufacturedAt: e.target.value }))}
                    className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">VIN</Label>
                  <Input value={form.vehicleVin} onChange={(e) => setForm((p) => ({ ...p, vehicleVin: e.target.value }))}
                    placeholder="차량 식별번호" className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">사용기간 (개월)</Label>
                  <Input type="number" value={form.usageMonths} onChange={(e) => setForm((p) => ({ ...p, usageMonths: e.target.value }))}
                    placeholder="예: 24" className="mt-1 h-8 text-sm" />
                </div>
              </div>

              {/* 발생 위치 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">발생 지역</Label>
                  <Input value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                    placeholder="예: 서울, 경기, 미국 서부" className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">딜러 / 사업소</Label>
                  <Input value={form.dealerName} onChange={(e) => setForm((p) => ({ ...p, dealerName: e.target.value }))}
                    placeholder="예: 현대 강남 서비스센터" className="mt-1 h-8 text-sm" />
                </div>
              </div>

              {/* 주행거리 */}
              <div>
                <Label className="text-xs">주행거리 (km)</Label>
                <Input type="number" value={form.mileageKm} onChange={(e) => setForm((p) => ({ ...p, mileageKm: e.target.value }))}
                  placeholder="예: 35000" className="mt-1 h-8 text-sm w-1/2" />
              </div>

              {/* DTC 코드 */}
              <div>
                <Label className="text-xs">불량코드 (DTC)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={dtcInput} onChange={(e) => setDtcInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDtc(); } }}
                    placeholder="예: P0171, C1234" className="flex-1 h-8 text-sm uppercase" />
                  <Button size="sm" variant="outline" onClick={addDtc} className="h-8">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {form.dtcCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.dtcCodes.map((code) => (
                      <span key={code} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono font-medium text-emerald-800">
                        {code}
                        <button onClick={() => removeDtc(code)} className="text-emerald-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 고객 증상 */}
              <div>
                <Label className="text-xs">고객 증상 기술</Label>
                <Textarea value={form.symptomDescription} onChange={(e) => setForm((p) => ({ ...p, symptomDescription: e.target.value }))}
                  placeholder="고객이 보고한 증상을 그대로 기재하세요." rows={3} className="mt-1 text-sm" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); if (detail) resetForm(detail); }}>취소</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    저장
                  </Button>
                </div>
              </div>
            </>
          ) : hasData ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {detail.vehicleModel && <><dt className="text-muted-foreground">차종</dt><dd className="font-medium">{detail.vehicleModel}</dd></>}
              {detail.manufacturedAt && <><dt className="text-muted-foreground">제조년월</dt><dd className="font-medium">{new Date(detail.manufacturedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit" })}</dd></>}
              {detail.vehicleVin && <><dt className="text-muted-foreground">VIN</dt><dd className="font-medium font-mono text-xs">{detail.vehicleVin}</dd></>}
              {detail.usageMonths != null && <><dt className="text-muted-foreground">사용기간</dt><dd className="font-medium">{detail.usageMonths}개월</dd></>}
              {detail.region && <><dt className="text-muted-foreground">발생 지역</dt><dd className="font-medium">{detail.region}</dd></>}
              {detail.dealerName && <><dt className="text-muted-foreground">딜러/사업소</dt><dd className="font-medium">{detail.dealerName}</dd></>}
              {detail.mileageKm && <><dt className="text-muted-foreground">주행거리</dt><dd className="font-medium">{Number(detail.mileageKm).toLocaleString("ko-KR")} km</dd></>}
              {detail.dtcCodes && detail.dtcCodes.length > 0 && (
                <>
                  <dt className="text-muted-foreground">불량코드 (DTC)</dt>
                  <dd className="flex flex-wrap gap-1">
                    {detail.dtcCodes.map((code) => (
                      <span key={code} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono font-medium text-emerald-800">{code}</span>
                    ))}
                  </dd>
                </>
              )}
              {detail.symptomDescription && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">고객 증상</dt>
                  <dd className="font-medium mt-0.5 whitespace-pre-wrap">{detail.symptomDescription}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">입력된 정보가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
