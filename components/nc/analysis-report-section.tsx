"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  FileText, ChevronDown, ChevronUp, Save, Loader2,
  Download, Printer, RefreshCw, Trash2, CheckCircle2, PenLine, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportNodeToPdf } from "@/lib/pdf/export-node-to-pdf";

interface Sections {
  problemDescription: string;
  rootCause: string;
  conclusion: string;
  followUp: string;
  // 레거시 필드 (구버전 8D 구조 보고서 호환용, 신규 작성 시 사용 안 함)
  immediateContainment?: string;
  permanentActions?: string;
  prevention?: string;
}

const LEGACY_FIELDS: Array<{ key: "immediateContainment" | "permanentActions" | "prevention"; labelKey: string }> = [
  { key: "immediateContainment", labelKey: "sections.immediateContainment" },
  { key: "permanentActions", labelKey: "sections.permanentActions" },
  { key: "prevention", labelKey: "sections.prevention" },
];

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

type SectionKey = "problemDescription" | "rootCause" | "conclusion" | "followUp";
type SectionDef = { key: SectionKey; label: string; placeholder: string };

export function AnalysisReportSection({ complaintId, capaId, complaintInfo, onComplaintClosed }: Props) {
  const t = useTranslations("complaint");
  const tc = useTranslations("common");
  const tr = useTranslations("complaint.report" as "complaint");

  const resolutionType = complaintInfo.resolutionType;
  const isNtf = resolutionType === "ntf";
  const isCustomerFault = resolutionType === "customer_misuse";
  const isClosureByReport = isNtf || isCustomerFault;

  // Build section definitions using translations
  function getSectionDefs(): SectionDef[] {
    return [
      {
        key: "problemDescription",
        label: tr("sections.problemDescription" as Parameters<typeof tr>[0]),
        placeholder: "",
      },
      {
        key: "rootCause",
        label: isNtf
          ? tr("sections.rootCauseNtf" as Parameters<typeof tr>[0])
          : isCustomerFault
          ? tr("sections.rootCauseFault" as Parameters<typeof tr>[0])
          : tr("sections.rootCause" as Parameters<typeof tr>[0]),
        placeholder: "",
      },
      {
        key: "conclusion",
        label: tr("sections.conclusion" as Parameters<typeof tr>[0]),
        placeholder: "",
      },
      {
        key: "followUp",
        label: tr("sections.followUp" as Parameters<typeof tr>[0]),
        placeholder: capaId
          ? tr("sections.followUpCapaHint" as Parameters<typeof tr>[0])
          : tr("sections.followUpPlaceholder" as Parameters<typeof tr>[0]),
      },
    ];
  }

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importingCapa, setImportingCapa] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<Sections>({
    problemDescription: "", rootCause: "", conclusion: "", followUp: "",
  });

  const sectionDefs = getSectionDefs();

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
      if (!res.ok) { toast.error(tc("error")); return; }
      const data = await res.json();
      setReport(data);
      setSections(data.sections);
      setExpanded(true);
      setEditing(true);
      toast.success(importFromCapa
        ? tr("createdFromCapaMsg" as Parameters<typeof tr>[0])
        : tr("createdMsg" as Parameters<typeof tr>[0]));
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
      if (!res.ok) { toast.error(tc("error")); return; }
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
          toast.error(tr("closeFailedMsg" as Parameters<typeof tr>[0]));
        } else {
          toast.success(isNtf
            ? tr("closeNtfSuccess" as Parameters<typeof tr>[0])
            : tr("closeSuccess" as Parameters<typeof tr>[0]));
          onComplaintClosed?.();
        }
      } else {
        toast.success(finalise ? tc("success") : tc("success"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleImportCapa() {
    if (!report || !capaId) return;
    if (!confirm(tr("importConfirm" as Parameters<typeof tr>[0]))) return;
    setImportingCapa(true);
    try {
      const res = await fetch(`/api/nc/analysis-reports/${report.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capaId }),
      });
      if (!res.ok) { toast.error(tc("error")); return; }
      const updated = await res.json();
      setReport(updated);
      setSections(updated.sections);
      toast.success(tr("importedCapa" as Parameters<typeof tr>[0]));
    } finally {
      setImportingCapa(false);
    }
  }

  async function handleDelete() {
    if (!report) return;
    if (!confirm(tr("deleteConfirm" as Parameters<typeof tr>[0]))) return;
    await fetch(`/api/nc/analysis-reports/${report.id}`, { method: "DELETE" });
    setReport(null);
    setSections({ problemDescription: "", rootCause: "", conclusion: "", followUp: "" });
    setEditing(false);
    setExpanded(false);
    toast.success(tc("success"));
  }

  async function handleDownloadPdf() {
    if (!report) return;
    setExportingPdf(true);
    try {
      const wasExpanded = expanded;
      if (!wasExpanded) {
        setExpanded(true);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      if (printRef.current) {
        await exportNodeToPdf(printRef.current, `report_${complaintInfo.complaintNumber}.pdf`);
      }
      if (!wasExpanded) setExpanded(false);
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleDownloadPptx() {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const prs = new PptxGenJS();
    prs.layout = "LAYOUT_WIDE";

    const ACCENT = isNtf ? "374151" : isCustomerFault ? "7C3AED" : "1E40AF";

    const resolutionLabels: Record<string, string> = {
      ntf: tr("resolutionLabels.ntf" as Parameters<typeof tr>[0]),
      customer_misuse: tr("resolutionLabels.customer_misuse" as Parameters<typeof tr>[0]),
      confirmed_nc: tr("resolutionLabels.confirmed_nc" as Parameters<typeof tr>[0]),
      partial: tr("resolutionLabels.partial" as Parameters<typeof tr>[0]),
    };

    // Cover slide
    const cover = prs.addSlide();
    cover.background = { color: ACCENT };
    const reportTitle = tr("title" as Parameters<typeof tr>[0]);
    cover.addText(reportTitle, { x: 0.8, y: 1.5, w: 11.5, h: 1, fontSize: 36, bold: true, color: "FFFFFF" });
    cover.addText(complaintInfo.title, { x: 0.8, y: 2.7, w: 11.5, h: 0.6, fontSize: 18, color: "D1D5DB" });
    const meta = [
      `${t("complaintNumber")}: ${complaintInfo.complaintNumber}`,
      `${t("customer")}: ${complaintInfo.customerName}`,
      `${t("part")}: ${complaintInfo.partName}`,
      `${t("receivedAt")}: ${new Date(complaintInfo.receivedAt).toLocaleDateString()}`,
      resolutionType
        ? `${tr("judgment" as Parameters<typeof tr>[0])}: ${resolutionLabels[resolutionType] ?? resolutionType}`
        : `${t("severity")}: ${t(`severities.${complaintInfo.severity}` as Parameters<typeof t>[0]) ?? complaintInfo.severity}`,
    ].join("   |   ");
    cover.addText(meta, { x: 0.8, y: 3.8, w: 11.5, h: 0.4, fontSize: 11, color: "9CA3AF" });
    cover.addText(new Date().toLocaleDateString(), { x: 0.8, y: 5.5, w: 11.5, h: 0.3, fontSize: 10, color: "9CA3AF" });

    // Section slides
    for (const def of sectionDefs) {
      const content = sections[def.key];
      if (!content?.trim()) continue;
      const slide = prs.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: ACCENT } });
      slide.addText(def.label, { x: 0.4, y: 0.1, w: 12, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
      slide.addText(content, { x: 0.4, y: 1.1, w: 12.5, h: 4.7, fontSize: 13, color: "111827", valign: "top", wrap: true, paraSpaceAfter: 6 });
    }

    prs.writeFile({ fileName: `report_${complaintInfo.complaintNumber}.pptx` });
    toast.success(tr("downloadPpt" as Parameters<typeof tr>[0]));
  }

  if (loading) return null;

  const resolutionLabels: Record<string, string> = {
    ntf: tr("resolutionLabels.ntf" as Parameters<typeof tr>[0]),
    customer_misuse: tr("resolutionLabels.customer_misuse" as Parameters<typeof tr>[0]),
    confirmed_nc: tr("resolutionLabels.confirmed_nc" as Parameters<typeof tr>[0]),
    partial: tr("resolutionLabels.partial" as Parameters<typeof tr>[0]),
  };

  const accentClass = isNtf ? "text-gray-600" : isCustomerFault ? "text-purple-600" : "text-indigo-600";
  const bannerClass = isNtf
    ? "bg-gray-50 border-gray-200 text-gray-700"
    : "bg-purple-50 border-purple-200 text-purple-700";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <FileText className={`h-4 w-4 ${accentClass}`} />
          {tr("title" as Parameters<typeof tr>[0])}
          {report && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              report.status === "final" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
            }`}>
              {report.status === "final"
                ? tr("final" as Parameters<typeof tr>[0])
                : tr("draft" as Parameters<typeof tr>[0])}
            </span>
          )}
          {resolutionType && resolutionLabels[resolutionType] && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${bannerClass}`}>
              {resolutionLabels[resolutionType]}
            </span>
          )}
        </h2>

        {report ? (
          <div className="flex items-center gap-1.5">
            {capaId && (
              <Button variant="ghost" size="sm" onClick={handleImportCapa} disabled={importingCapa} title={tr("importFromCapa" as Parameters<typeof tr>[0])}>
                {importingCapa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => window.print()} title="인쇄">
              <Printer className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadPdf} disabled={editing || exportingPdf} title="PDF 다운로드">
              <span className="text-[10px] font-bold text-red-600">PDF</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadPptx} title="PPT 다운로드">
              <Download className="h-3.5 w-3.5" />
            </Button>
            {!editing && report.status !== "final" && (
              <Button variant="outline" size="sm" onClick={() => { setEditing(true); setExpanded(true); }}>
                <PenLine className="h-3.5 w-3.5 mr-1" />{tc("edit")}
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
                {tr("createFromCapa" as Parameters<typeof tr>[0])}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleCreate(false)} disabled={creating}>
              {creating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <PenLine className="h-3.5 w-3.5 mr-1" />}
              {tr("create" as Parameters<typeof tr>[0])}
            </Button>
          </div>
        )}
      </div>

      {/* NTF / fault banner */}
      {isClosureByReport && !report && (
        <div className={`rounded-xl border px-4 py-3 text-xs ${bannerClass}`}>
          {isNtf
            ? tr("ntfBanner" as Parameters<typeof tr>[0])
            : tr("faultBanner" as Parameters<typeof tr>[0])}
        </div>
      )}

      {report && expanded && (
        <div ref={printRef} className="space-y-4">
          {/* Claim overview (auto) */}
          <div className={`rounded-xl p-4 text-sm space-y-1 ${isNtf ? "bg-gray-50" : isCustomerFault ? "bg-purple-50" : "bg-indigo-50"}`}>
            <p className={`font-semibold mb-2 ${isNtf ? "text-gray-700" : isCustomerFault ? "text-purple-800" : "text-indigo-800"}`}>
              {tr("claimOverview" as Parameters<typeof tr>[0])}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <span className="text-muted-foreground">{t("complaintNumber")}</span><span className="font-medium">{complaintInfo.complaintNumber}</span>
              <span className="text-muted-foreground">{t("customer")}</span><span className="font-medium">{complaintInfo.customerName}</span>
              <span className="text-muted-foreground">{t("part")}</span><span className="font-medium">{complaintInfo.partName}</span>
              <span className="text-muted-foreground">{t("receivedAt")}</span><span className="font-medium">{new Date(complaintInfo.receivedAt).toLocaleDateString()}</span>
              {resolutionType && (
                <>
                  <span className="text-muted-foreground">{tr("judgment" as Parameters<typeof tr>[0])}</span>
                  <span className="font-medium">{resolutionLabels[resolutionType] ?? resolutionType}</span>
                </>
              )}
            </div>
          </div>

          {/* Sections */}
          {sectionDefs.map((def) => (
            <div key={def.key} className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {def.label}
                {def.key === "followUp" && <span className="ml-1.5 font-normal text-xs text-muted-foreground">{tr("optional" as Parameters<typeof tr>[0])}</span>}
              </Label>
              {editing ? (
                <Textarea
                  value={sections[def.key]}
                  onChange={(e) => setSections((p) => ({ ...p, [def.key]: e.target.value }))}
                  rows={4}
                  placeholder={def.placeholder}
                  className="text-sm"
                />
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm whitespace-pre-wrap min-h-[60px]">
                  {sections[def.key] || <span className="text-muted-foreground italic">
                    {def.key === "followUp" && capaId ? tr("sections.followUpCapaHint" as Parameters<typeof tr>[0]) : tr("notEntered" as Parameters<typeof tr>[0])}
                  </span>}
                </div>
              )}
            </div>
          ))}

          {/* 레거시 8D 항목 (구버전 보고서에 데이터가 남아있는 경우에만 읽기 전용으로 표시) */}
          {LEGACY_FIELDS.some((f) => report.sections[f.key]?.trim()) && (
            <div className="pt-2 border-t border-dashed border-gray-200 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">{tr("legacyFieldsTitle" as Parameters<typeof tr>[0])}</p>
              {LEGACY_FIELDS.filter((f) => report.sections[f.key]?.trim()).map((f) => (
                <div key={f.key} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">{tr(f.labelKey as Parameters<typeof tr>[0])}</p>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm whitespace-pre-wrap text-muted-foreground">
                    {report.sections[f.key]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {editing && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />{tc("delete")}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setSections(report.sections); }}>{tc("cancel")}</Button>
                <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  {tr("tempSave" as Parameters<typeof tr>[0])}
                </Button>
                {isClosureByReport ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSave(true, false)} disabled={saving}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{tr("finalizeOnly" as Parameters<typeof tr>[0])}
                    </Button>
                    <Button size="sm" onClick={() => handleSave(true, true)} disabled={saving}
                      className={isNtf ? "bg-gray-700 hover:bg-gray-800" : "bg-purple-600 hover:bg-purple-700"}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                      {tr("finalizeAndClose" as Parameters<typeof tr>[0])}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => handleSave(true, false)} disabled={saving}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{tr("finalize" as Parameters<typeof tr>[0])}
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
