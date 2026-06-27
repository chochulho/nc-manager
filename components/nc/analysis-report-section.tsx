"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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

type SectionKey = keyof Sections;
type SectionDef = { key: SectionKey; label: string; d: string; placeholder: string };

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
        d: "D2",
        placeholder: "",
      },
      {
        key: "immediateContainment",
        label: isClosureByReport
          ? tr("sections.immediateContainmentNtf" as Parameters<typeof tr>[0])
          : tr("sections.immediateContainment" as Parameters<typeof tr>[0]),
        d: "D3",
        placeholder: "",
      },
      {
        key: "rootCause",
        label: isNtf
          ? tr("sections.rootCauseNtf" as Parameters<typeof tr>[0])
          : isCustomerFault
          ? tr("sections.rootCauseFault" as Parameters<typeof tr>[0])
          : tr("sections.rootCause" as Parameters<typeof tr>[0]),
        d: "D4",
        placeholder: "",
      },
      {
        key: "permanentActions",
        label: isClosureByReport
          ? tr("sections.permanentActionsNtf" as Parameters<typeof tr>[0])
          : tr("sections.permanentActions" as Parameters<typeof tr>[0]),
        d: isClosureByReport ? "" : "D5/D6",
        placeholder: "",
      },
      {
        key: "prevention",
        label: isClosureByReport
          ? tr("sections.preventionNtf" as Parameters<typeof tr>[0])
          : tr("sections.prevention" as Parameters<typeof tr>[0]),
        d: isClosureByReport ? "" : "D7",
        placeholder: "",
      },
      {
        key: "conclusion",
        label: tr("sections.conclusion" as Parameters<typeof tr>[0]),
        d: "",
        placeholder: "",
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
  const [sections, setSections] = useState<Sections>({
    problemDescription: "", immediateContainment: "", rootCause: "",
    permanentActions: "", prevention: "", conclusion: "",
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
    setSections({ problemDescription: "", immediateContainment: "", rootCause: "", permanentActions: "", prevention: "", conclusion: "" });
    setEditing(false);
    setExpanded(false);
    toast.success(tc("success"));
  }

  async function handleDownloadPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const MARGIN = 18;
    const PAGE_W = 210;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    let y = MARGIN;

    const addPage = () => { doc.addPage(); y = MARGIN; };
    const checkY = (needed: number) => { if (y + needed > 280) addPage(); };

    // Header bar
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, PAGE_W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("NC Manager  |  분석보고서", MARGIN, 8);
    y = 22;

    // Title
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(complaintInfo.title, MARGIN, y);
    y += 8;

    // Meta info
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    const meta = [
      `${complaintInfo.complaintNumber}`,
      `고객사: ${complaintInfo.customerName}`,
      `부품: ${complaintInfo.partName}`,
      `접수일: ${new Date(complaintInfo.receivedAt).toLocaleDateString()}`,
      resolutionType ? `판정: ${resolutionLabels[resolutionType] ?? resolutionType}` : "",
    ].filter(Boolean).join("   |   ");
    doc.text(meta, MARGIN, y, { maxWidth: CONTENT_W });
    y += 8;

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;

    // Sections
    for (const def of sectionDefs) {
      const content = sections[def.key];
      if (!content?.trim()) continue;

      checkY(20);

      // Section label
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(MARGIN, y, CONTENT_W, 8, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      const label = def.d ? `${def.d}  ${def.label}` : def.label;
      doc.text(label, MARGIN + 3, y + 5.5);
      y += 12;

      // Section content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      const lines = doc.splitTextToSize(content, CONTENT_W);
      for (const line of lines) {
        checkY(6);
        doc.text(line, MARGIN, y);
        y += 5.5;
      }
      y += 6;
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`${new Date().toLocaleDateString()}`, MARGIN, 290);
      doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, 290, { align: "right" });
    }

    doc.save(`report_${complaintInfo.complaintNumber}.pdf`);
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
      const headerText = def.d ? `${def.d}  ${def.label}` : def.label;
      slide.addText(headerText, { x: 0.4, y: 0.1, w: 12, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
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
            <Button variant="ghost" size="sm" onClick={handleDownloadPdf} title="PDF 다운로드">
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
        <div className="space-y-4">
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
                  rows={4}
                  className="text-sm"
                />
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm whitespace-pre-wrap min-h-[60px]">
                  {sections[def.key] || <span className="text-muted-foreground italic">{tr("notEntered" as Parameters<typeof tr>[0])}</span>}
                </div>
              )}
            </div>
          ))}

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
