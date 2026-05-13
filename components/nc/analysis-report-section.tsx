"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText, ChevronDown, ChevronUp, Save, Loader2,
  Download, Printer, RefreshCw, Trash2, CheckCircle2, PenLine, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Sections {
  problemDescription: string;
  immediateContainment: string;
  rootCause: string;
  permanentActions: string;
  prevention: string;
  conclusion: string;
}

interface Report {
  id: string;
  status: "draft" | "final";
  sections: Sections;
  createdAt: string;
  updatedAt: string;
}

interface ComplaintInfo {
  complaintNumber: string;
  title: string;
  customerName: string;
  partName: string;
  receivedAt: Date | string;
  severity: string;
  resolutionType: string | null;
}

interface Props {
  complaintId: string;
  capaId: string | null;
  complaintInfo: ComplaintInfo;
  onComplaintClosed?: () => void;
}

type SectionDef = { key: keyof Sections; label: string; d: string; placeholder: string };

function getSectionDefs(resolutionType: string | null): SectionDef[] {
  const isNtf = resolutionType === "ntf";
  const isCustomerFault = resolutionType === "customer_misuse";
  const isClosureByReport = isNtf || isCustomerFault;

  return [
    {
      key: "problemDescription",
      label: "문제 설명",
      d: "D2",
      placeholder: "언제, 어디서, 어떤 불량이 발생했는지 구체적으로 기술하세요.",
    },
    {
      key: "immediateContainment",
      label: isClosureByReport ? "접수 대응 조치" : "즉각 봉쇄 조치",
      d: "D3",
      placeholder: isClosureByReport
        ? "클레임 접수 후 취한 초기 대응 및 고객 소통 내용을 기술하세요."
        : "발생한 불량에 대해 즉시 취한 봉쇄 조치를 기술하세요.",
    },
    {
      key: "rootCause",
      label: isNtf ? "불량 미재현 / 검증 결과" : isCustomerFault ? "귀책 분석" : "원인 분석",
      d: "D4",
      placeholder: isNtf
        ? "재현 시도 조건·결과, 검사 데이터, 미재현 판정 근거를 기술하세요."
        : isCustomerFault
        ? "고객 귀책으로 판단한 근거(사용 오류, 규격 초과, 설계 책임 등)를 기술하세요."
        : "5Why, 특성요인도 등 분석 결과를 기술하세요.",
    },
    {
      key: "permanentActions",
      label: isClosureByReport ? "추가 조치 계획" : "영구 시정조치",
      d: isClosureByReport ? "" : "D5/D6",
      placeholder: isClosureByReport
        ? "추가 모니터링, 예방 조치 또는 해당사항 없음을 기술하세요."
        : "재발 방지를 위한 영구 대책 및 실행 계획을 기술하세요.",
    },
    {
      key: "prevention",
      label: isClosureByReport ? "고객 피드백 및 향후 대응" : "재발 방지 / 수평전개",
      d: isClosureByReport ? "" : "D7",
      placeholder: isClosureByReport
        ? "고객에게 전달한 내용, 향후 유사 클레임 예방 방향을 기술하세요."
        : "유사 공정·제품에 대한 수평 전개 내용을 기술하세요.",
    },
    {
      key: "conclusion",
      label: "결론 및 종합",
      d: "",
      placeholder: isNtf
        ? "NTF 판정 결론을 요약하고 클레임 종결 사유를 기술하세요."
        : isCustomerFault
        ? "고객 귀책 판정 결론 및 클레임 종결 사유를 기술하세요."
        : "전체 대응 결과를 요약하고 종결 여부를 기술하세요.",
    },
  ];
}

const RESOLUTION_LABELS: Record<string, string> = {
  ntf: "불량 미재현 (NTF)",
  customer_misuse: "고객 귀책",
  confirmed_nc: "실제 부적합",
  partial: "부분 인정",
};

export function AnalysisReportSection({ complaintId, capaId, complaintInfo, onComplaintClosed }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importingCapa, setImportingCapa] = useState(false);
  const [sections, setSections] = useState<Sections>({
    problemDescription: "", immediateContainment: "", rootCause: "",
    permanentActions: "", prevention: "", conclusion: "",
  });

  const resolutionType = complaintInfo.resolutionType;
  const isNtf = resolutionType === "ntf";
  const isCustomerFault = resolutionType === "customer_misuse";
  const isClosureByReport = isNtf || isCustomerFault;
  const sectionDefs = getSectionDefs(resolutionType);

  async function load() {
    const res = await fetch(`/api/nc/analysis-reports?complaintId=${complaintId}`);
    if (res.ok) {
      const data = await res.json();
      setReport(data);
      if (data) setSections(data.sections);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [complaintId]);

  async function handleCreate(importFromCapa = false) {
    setCreating(true);
    try {
      const res = await fetch("/api/nc/analysis-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId, importFromCapa }),
      });
      if (!res.ok) { toast.error("생성에 실패했습니다."); return; }
      const data = await res.json();
      setReport(data);
      setSections(data.sections);
      setExpanded(true);
      setEditing(true);
      toast.success(importFromCapa ? "CAPA 데이터를 불러와 보고서를 생성했습니다." : "분석보고서를 생성했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(finalise = false, closeComplaint = false) {
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/analysis-reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, ...(finalise && { status: "final" }) }),
      });
      if (!res.ok) { toast.error("저장에 실패했습니다."); return; }
      const updated = await res.json();
      setReport(updated);
      setEditing(false);

      if (closeComplaint) {
        const closeStatus = isNtf ? "closed_ntf" : "closed";
        const closeRes = await fetch(`/api/nc/complaints/${complaintId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: closeStatus, closedAt: new Date().toISOString() }),
        });
        if (!closeRes.ok) {
          toast.error("보고서는 확정됐지만 클레임 종결에 실패했습니다.");
        } else {
          toast.success(isNtf ? "보고서 확정 + 클레임 종결(NTF) 처리됐습니다." : "보고서 확정 + 클레임 종결 처리됐습니다.");
          onComplaintClosed?.();
        }
      } else {
        toast.success(finalise ? "최종 확정되었습니다." : "저장됐습니다.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleImportCapa() {
    if (!report || !capaId) return;
    if (!confirm("현재 입력 내용을 CAPA 데이터로 덮어씁니다. 계속하시겠습니까?")) return;
    setImportingCapa(true);
    try {
      const res = await fetch(`/api/nc/analysis-reports/${report.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capaId }),
      });
      if (!res.ok) { toast.error("불러오기에 실패했습니다."); return; }
      const updated = await res.json();
      setReport(updated);
      setSections(updated.sections);
      toast.success("CAPA 데이터를 불러왔습니다.");
    } finally {
      setImportingCapa(false);
    }
  }

  async function handleDelete() {
    if (!report) return;
    if (!confirm("분석보고서를 삭제하시겠습니까?")) return;
    await fetch(`/api/nc/analysis-reports/${report.id}`, { method: "DELETE" });
    setReport(null);
    setSections({ problemDescription: "", immediateContainment: "", rootCause: "", permanentActions: "", prevention: "", conclusion: "" });
    setEditing(false);
    setExpanded(false);
    toast.success("삭제됐습니다.");
  }

  async function handleDownloadPptx() {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const prs = new PptxGenJS();
    prs.layout = "LAYOUT_WIDE";

    const ACCENT = isNtf ? "374151" : isCustomerFault ? "7C3AED" : "1E40AF";

    // 커버
    const cover = prs.addSlide();
    cover.background = { color: ACCENT };
    const reportTitle = isNtf ? "분석보고서 (NTF)" : isCustomerFault ? "분석보고서 (고객 귀책)" : "분석보고서";
    cover.addText(reportTitle, { x: 0.8, y: 1.5, w: 11.5, h: 1, fontSize: 36, bold: true, color: "FFFFFF" });
    cover.addText(complaintInfo.title, { x: 0.8, y: 2.7, w: 11.5, h: 0.6, fontSize: 18, color: "D1D5DB" });
    const meta = [
      `클레임 번호: ${complaintInfo.complaintNumber}`,
      `고객사: ${complaintInfo.customerName}`,
      `부품: ${complaintInfo.partName}`,
      `접수일: ${new Date(complaintInfo.receivedAt).toLocaleDateString("ko-KR")}`,
      resolutionType ? `판정: ${RESOLUTION_LABELS[resolutionType] ?? resolutionType}` : `심각도: ${{ critical: "긴급", major: "주요", minor: "경미" }[complaintInfo.severity] ?? complaintInfo.severity}`,
    ].join("   |   ");
    cover.addText(meta, { x: 0.8, y: 3.8, w: 11.5, h: 0.4, fontSize: 11, color: "9CA3AF" });
    cover.addText(new Date().toLocaleDateString("ko-KR"), { x: 0.8, y: 5.5, w: 11.5, h: 0.3, fontSize: 10, color: "9CA3AF" });

    // 섹션 슬라이드
    for (const def of sectionDefs) {
      const content = sections[def.key];
      if (!content?.trim()) continue;
      const slide = prs.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: ACCENT } });
      const headerText = def.d ? `${def.d}  ${def.label}` : def.label;
      slide.addText(headerText, { x: 0.4, y: 0.1, w: 12, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
      slide.addText(content, { x: 0.4, y: 1.1, w: 12.5, h: 4.7, fontSize: 13, color: "111827", valign: "top", wrap: true, paraSpaceAfter: 6 });
    }

    prs.writeFile({ fileName: `분석보고서_${complaintInfo.complaintNumber}.pptx` });
    toast.success("PPT 파일을 다운로드합니다.");
  }

  if (loading) return null;

  const accentClass = isNtf ? "text-gray-600" : isCustomerFault ? "text-purple-600" : "text-indigo-600";
  const bannerClass = isNtf
    ? "bg-gray-50 border-gray-200 text-gray-700"
    : "bg-purple-50 border-purple-200 text-purple-700";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <FileText className={`h-4 w-4 ${accentClass}`} />
          분석보고서
          {report && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              report.status === "final" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
            }`}>
              {report.status === "final" ? "최종" : "초안"}
            </span>
          )}
          {resolutionType && RESOLUTION_LABELS[resolutionType] && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${bannerClass}`}>
              {RESOLUTION_LABELS[resolutionType]}
            </span>
          )}
        </h2>

        {report ? (
          <div className="flex items-center gap-1.5">
            {capaId && (
              <Button variant="ghost" size="sm" onClick={handleImportCapa} disabled={importingCapa} title="CAPA에서 불러오기">
                {importingCapa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => window.print()} title="인쇄">
              <Printer className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadPptx} title="PPT 다운로드">
              <Download className="h-3.5 w-3.5" />
            </Button>
            {!editing && report.status !== "final" && (
              <Button variant="outline" size="sm" onClick={() => { setEditing(true); setExpanded(true); }}>
                <PenLine className="h-3.5 w-3.5 mr-1" />편집
              </Button>
            )}
            <button onClick={() => setExpanded((v) => !v)} className="p-1 text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {capaId && (
              <Button variant="outline" size="sm" onClick={() => handleCreate(true)} disabled={creating}>
                {creating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                CAPA에서 생성
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleCreate(false)} disabled={creating}>
              {creating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <PenLine className="h-3.5 w-3.5 mr-1" />}
              보고서 작성
            </Button>
          </div>
        )}
      </div>

      {/* NTF / 귀책 안내 배너 */}
      {isClosureByReport && !report && (
        <div className={`rounded-xl border px-4 py-3 text-xs ${bannerClass}`}>
          {isNtf
            ? "NTF 케이스입니다. 분석보고서 작성 후 보고서에서 직접 클레임을 종결할 수 있습니다."
            : "고객 귀책 케이스입니다. 분석보고서 작성 후 보고서에서 직접 클레임을 종결할 수 있습니다."}
        </div>
      )}

      {report && expanded && (
        <div className="space-y-4">
          {/* 클레임 개요 (자동) */}
          <div className={`rounded-xl p-4 text-sm space-y-1 ${isNtf ? "bg-gray-50" : isCustomerFault ? "bg-purple-50" : "bg-indigo-50"}`}>
            <p className={`font-semibold mb-2 ${isNtf ? "text-gray-700" : isCustomerFault ? "text-purple-800" : "text-indigo-800"}`}>
              클레임 개요 (자동)
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <span className="text-muted-foreground">클레임 번호</span><span className="font-medium">{complaintInfo.complaintNumber}</span>
              <span className="text-muted-foreground">고객사</span><span className="font-medium">{complaintInfo.customerName}</span>
              <span className="text-muted-foreground">부품</span><span className="font-medium">{complaintInfo.partName}</span>
              <span className="text-muted-foreground">접수일</span><span className="font-medium">{new Date(complaintInfo.receivedAt).toLocaleDateString("ko-KR")}</span>
              {resolutionType && (
                <>
                  <span className="text-muted-foreground">판정</span>
                  <span className="font-medium">{RESOLUTION_LABELS[resolutionType] ?? resolutionType}</span>
                </>
              )}
            </div>
          </div>

          {/* 섹션들 */}
          {sectionDefs.map((def) => (
            <div key={def.key} className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                {def.d && (
                  <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${isNtf ? "bg-gray-100 text-gray-600" : isCustomerFault ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"}`}>
                    {def.d}
                  </span>
                )}
                {def.label}
              </Label>
              {editing ? (
                <Textarea
                  value={sections[def.key]}
                  onChange={(e) => setSections((p) => ({ ...p, [def.key]: e.target.value }))}
                  placeholder={def.placeholder}
                  rows={4}
                  className="text-sm"
                />
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm whitespace-pre-wrap min-h-[60px]">
                  {sections[def.key] || <span className="text-muted-foreground italic">미입력</span>}
                </div>
              )}
            </div>
          ))}

          {editing && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setSections(report.sections); }}>취소</Button>
                <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  임시저장
                </Button>
                {isClosureByReport ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSave(true, false)} disabled={saving}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />보고서만 확정
                    </Button>
                    <Button size="sm" onClick={() => handleSave(true, true)} disabled={saving}
                      className={isNtf ? "bg-gray-700 hover:bg-gray-800" : "bg-purple-600 hover:bg-purple-700"}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                      확정 + 클레임 종결
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => handleSave(true, false)} disabled={saving}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />최종 확정
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
