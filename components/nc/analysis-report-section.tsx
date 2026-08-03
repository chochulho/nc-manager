"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  FileText, ChevronDown, ChevronUp, Save, Loader2,
  Download, Printer, RefreshCw, Trash2, CheckCircle2, PenLine, XCircle, Upload, X, Paperclip, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upload } from "@vercel/blob/client";
import { exportNodeToPdf } from "@/lib/pdf/export-node-to-pdf";
import { ReportTableBlock } from "@/components/nc/report-table-block";
import type { ReportTemplateBlock, ReportBlockValue, BlockAttachment } from "@/lib/db/schema";

const RESOLUTION_TYPE_KEYS = ["confirmed_nc", "ntf", "customer_misuse", "partial"] as const;

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

interface ReportTemplateFull {
  id: string;
  name: string;
  accentColor: string;
  blocks: ReportTemplateBlock[];
}

interface TemplateOption {
  id: string;
  name: string;
  customerId: string | null;
  isDefault: boolean;
}

interface Report {
  id: string;
  status: "draft" | "final";
  sections: Sections;
  templateId: string | null;
  blockData: Record<string, ReportBlockValue> | null;
  template: ReportTemplateFull | null;
  createdAt: string;
  updatedAt: string;
}

interface ComplaintInfo {
  complaintNumber: string;
  title: string;
  customerId: string;
  customerName: string;
  partName: string;
  partNumberDetail: string | null;
  lotNumber: string | null;
  quantityClaimed: string | null;
  quantityConfirmed: string | null;
  customerSiteName: string | null;
  customerReference: string | null;
  occurredAt: Date | string | null;
  receivedAt: Date | string;
  severity: string;
  resolutionType: string | null;
}

interface FieldClaimInfo {
  vehicleModel: string | null;
  vehicleVin: string | null;
  manufacturedAt: string | null;
  region: string | null;
  dealerName: string | null;
  mileageKm: string | null;
  usageMonths: number | null;
  dtcCodes: string[] | null;
  symptomDescription: string | null;
  extraData: { soldAt?: string | null; repairedAt?: string | null; incidentLocationType?: string | null } | null;
}

interface Props {
  complaintId: string;
  capaId: string | null;
  complaintInfo: ComplaintInfo;
  onComplaintUpdated?: () => void;
}

type SectionKey = "problemDescription" | "rootCause" | "conclusion" | "followUp";
type SectionDef = { key: SectionKey; label: string; placeholder: string };

function groupBlocksIntoRows(blocks: ReportTemplateBlock[]): ReportTemplateBlock[][] {
  const rows: ReportTemplateBlock[][] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if ((b.width ?? "full") === "half" && next && (next.width ?? "full") === "half") {
      rows.push([b, next]);
      i += 2;
    } else {
      rows.push([b]);
      i += 1;
    }
  }
  return rows;
}

export function AnalysisReportSection({ complaintId, capaId, complaintInfo, onComplaintUpdated }: Props) {
  const t = useTranslations("complaint");
  const tc = useTranslations("common");
  const tr = useTranslations("complaint.report" as "complaint");

  const [resolutionType, setResolutionType] = useState<string | null>(complaintInfo.resolutionType);
  const [savingResolution, setSavingResolution] = useState(false);
  useEffect(() => setResolutionType(complaintInfo.resolutionType), [complaintInfo.resolutionType]);

  const isNtf = resolutionType === "ntf";
  const isCustomerFault = resolutionType === "customer_misuse";
  const isClosureByReport = isNtf || isCustomerFault;

  // Build section definitions using translations (legacy fixed format)
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
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState<string | null>(null);
  const [fieldClaim, setFieldClaim] = useState<FieldClaimInfo | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<Sections>({
    problemDescription: "", rootCause: "", conclusion: "", followUp: "",
  });
  const [blockData, setBlockData] = useState<Record<string, ReportBlockValue>>({});

  const [availableTemplates, setAvailableTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("auto");

  const sectionDefs = getSectionDefs();

  async function load() {
    const res = await fetch(`/api/nc/analysis-reports?complaintId=${complaintId}`);
    if (res.ok) {
      const data = await res.json();
      setReport(data);
      if (data) {
        setSections(data.sections);
        setBlockData(data.blockData ?? {});
      }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [complaintId]);

  useEffect(() => {
    fetch(`/api/nc/masters/report-templates?customerId=${complaintInfo.customerId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TemplateOption[]) => setAvailableTemplates(data))
      .catch(() => setAvailableTemplates([]));
  }, [complaintInfo.customerId]);

  useEffect(() => {
    fetch(`/api/nc/field-claim-details?complaintId=${complaintId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FieldClaimInfo | null) => setFieldClaim(data))
      .catch(() => setFieldClaim(null));
  }, [complaintId]);

  // 클레임 기본정보 + 필드클레임정보를 보고서 텍스트 블록에 삽입 가능한 형태로 요약
  function buildClaimInfoSnippet(): string {
    const lines: string[] = [];
    if (complaintInfo.partNumberDetail) lines.push(`◆ 품번: ${complaintInfo.partNumberDetail}`);
    if (complaintInfo.lotNumber) lines.push(`◆ LOT 번호: ${complaintInfo.lotNumber}`);
    if (complaintInfo.quantityClaimed) {
      lines.push(`◆ 클레임 수량: ${complaintInfo.quantityClaimed}${complaintInfo.quantityConfirmed ? ` (확인수량: ${complaintInfo.quantityConfirmed})` : ""}`);
    }
    if (complaintInfo.customerSiteName) lines.push(`◆ 고객사 공장: ${complaintInfo.customerSiteName}`);
    if (complaintInfo.customerReference) lines.push(`◆ 고객사 참조번호: ${complaintInfo.customerReference}`);
    if (complaintInfo.occurredAt) lines.push(`◆ 발생일: ${new Date(complaintInfo.occurredAt).toLocaleDateString()}`);
    if (fieldClaim) {
      if (fieldClaim.vehicleModel) lines.push(`◆ 차종: ${fieldClaim.vehicleModel}`);
      if (fieldClaim.vehicleVin) lines.push(`◆ VIN: ${fieldClaim.vehicleVin}`);
      if (fieldClaim.manufacturedAt) lines.push(`◆ 제조일: ${new Date(fieldClaim.manufacturedAt).toLocaleDateString()}`);
      if (fieldClaim.extraData?.soldAt) lines.push(`◆ 판매일: ${new Date(fieldClaim.extraData.soldAt).toLocaleDateString()}`);
      if (fieldClaim.extraData?.repairedAt) lines.push(`◆ 수리일: ${new Date(fieldClaim.extraData.repairedAt).toLocaleDateString()}`);
      if (fieldClaim.mileageKm) lines.push(`◆ 주행거리: ${Number(fieldClaim.mileageKm).toLocaleString()}km`);
      if (fieldClaim.usageMonths != null) lines.push(`◆ 사용기간: ${fieldClaim.usageMonths}개월`);
      if (fieldClaim.region) lines.push(`◆ 발생 지역: ${fieldClaim.region}`);
      if (fieldClaim.dealerName) lines.push(`◆ 딜러/사업소: ${fieldClaim.dealerName}`);
      if (fieldClaim.dtcCodes?.length) lines.push(`◆ DTC: ${fieldClaim.dtcCodes.join(", ")}`);
      if (fieldClaim.symptomDescription) lines.push(`◆ 증상: ${fieldClaim.symptomDescription}`);
    }
    return lines.join("\n");
  }

  function insertClaimInfoInto(key: string) {
    const snippet = buildClaimInfoSnippet();
    if (!snippet) { toast.error(tr("noClaimInfo" as Parameters<typeof tr>[0])); return; }
    setBlockData((p) => {
      const current = p[key];
      const existingValue = current?.type === "text" ? current.value : "";
      const nextValue = existingValue ? `${existingValue}\n\n${snippet}` : snippet;
      const attachments = current?.type === "text" ? current.attachments : undefined;
      return { ...p, [key]: { type: "text", value: nextValue, attachments } };
    });
  }

  async function handleResolutionTypeChange(value: string) {
    const prev = resolutionType;
    setResolutionType(value);
    setSavingResolution(true);
    try {
      const res = await fetch(`/api/nc/complaints/${complaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionType: value }),
      });
      if (!res.ok) { toast.error(tc("error")); setResolutionType(prev); return; }
      onComplaintUpdated?.();
    } finally {
      setSavingResolution(false);
    }
  }

  async function handleCreate(importFromCapa = false) {
    setCreating(true);
    try {
      const body: Record<string, unknown> = { complaintId, importFromCapa };
      if (selectedTemplateId === "none") body.templateId = null;
      else if (selectedTemplateId !== "auto") body.templateId = selectedTemplateId;

      const res = await fetch("/api/nc/analysis-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error(tc("error")); return; }
      const data = await res.json();
      setReport(data);
      setSections(data.sections);
      setBlockData(data.blockData ?? {});
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
        body: JSON.stringify({ sections, blockData, ...(finalise && { status: "final" }) }),
      });
      if (!res.ok) { toast.error(tc("error")); return; }
      const updated = await res.json();
      setReport((prev) => (prev ? { ...prev, ...updated } : updated));
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
          onComplaintUpdated?.();
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
      setReport((prev) => (prev ? { ...prev, ...updated } : updated));
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
    setBlockData({});
    setEditing(false);
    setExpanded(false);
    toast.success(tc("success"));
  }

  async function handlePhotoUpload(key: string, file: File | undefined) {
    if (!file || !report) return;
    setUploadingPhoto(key);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `nc/analysis_report/${report.id}/${key}-${Date.now()}.${ext}`;
      const blob = await upload(path, file, { access: "public", handleUploadUrl: "/api/nc/attachments/client-token" });
      setBlockData((p) => ({ ...p, [key]: { type: "photo", url: blob.url } }));
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploadingPhoto(null);
    }
  }

  function handlePhotoPaste(key: string, e: React.ClipboardEvent) {
    if (!editing) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const ext = file.type.split("/")[1] || "png";
          handlePhotoUpload(key, new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type }));
        }
        break;
      }
    }
  }

  async function handleBlockAttachmentUpload(key: string, kind: "text" | "table", files: FileList | null) {
    if (!files?.length || !report) return;
    setUploadingAttachment(key);
    try {
      const uploaded: BlockAttachment[] = [];
      for (const file of Array.from(files)) {
        const safeName = `nc/analysis_report/${report.id}/${key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${file.name}`;
        const blob = await upload(safeName, file, { access: "public", handleUploadUrl: "/api/nc/attachments/client-token" });
        uploaded.push({ filename: file.name, url: blob.url });
      }
      setBlockData((p) => {
        const current = p[key];
        if (kind === "text") {
          const value = current?.type === "text" ? current.value : "";
          const existing = current?.type === "text" ? current.attachments ?? [] : [];
          return { ...p, [key]: { type: "text", value, attachments: [...existing, ...uploaded] } };
        }
        const rows = current?.type === "table" ? current.rows : [];
        const existing = current?.type === "table" ? current.attachments ?? [] : [];
        return { ...p, [key]: { type: "table", rows, attachments: [...existing, ...uploaded] } };
      });
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploadingAttachment(null);
    }
  }

  function removeBlockAttachment(key: string, kind: "text" | "table", url: string) {
    setBlockData((p) => {
      const current = p[key];
      if (!current || current.type !== kind) return p;
      return { ...p, [key]: { ...current, attachments: (current.attachments ?? []).filter((a) => a.url !== url) } };
    });
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
    if (!report) return;
    const PptxGenJS = (await import("pptxgenjs")).default;
    const prs = new PptxGenJS();
    prs.layout = "LAYOUT_WIDE";
    type PptxSlide = ReturnType<typeof prs.addSlide>;

    const ACCENT = report.template?.accentColor || (isNtf ? "374151" : isCustomerFault ? "7C3AED" : "1E40AF");

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

    function addAttachmentLinks(slide: PptxSlide, attachments: BlockAttachment[] | undefined, x: number, y: number, w: number) {
      if (!attachments?.length) return;
      slide.addText(
        attachments.map((a, i) => ({
          text: `${i > 0 ? "   " : ""}📎 ${a.filename}`,
          options: { hyperlink: { url: a.url }, color: "2563EB", underline: { style: "sng" as const }, fontSize: 9 },
        })),
        { x, y, w, h: 0.3, valign: "top" }
      );
    }

    function addFullBlockSlide(block: ReportTemplateBlock) {
      const value = blockData[block.key];
      if (block.type === "text") {
        const content = value?.type === "text" ? value.value : "";
        const attachments = value?.type === "text" ? value.attachments : undefined;
        if (!content?.trim() && !attachments?.length) return;
        const slide = prs.addSlide();
        slide.background = { color: "FFFFFF" };
        slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: ACCENT } });
        slide.addText(block.label, { x: 0.4, y: 0.1, w: 12, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
        slide.addText(content, { x: 0.4, y: 1.1, w: 12.5, h: 4.6, fontSize: 13, color: "111827", valign: "top", wrap: true, paraSpaceAfter: 6 });
        addAttachmentLinks(slide, attachments, 0.4, 6.0, 12.5);
      } else if (block.type === "table") {
        const rows = value?.type === "table" ? value.rows : [];
        const attachments = value?.type === "table" ? value.attachments : undefined;
        if (!rows.length && !attachments?.length) return;
        const slide = prs.addSlide();
        slide.background = { color: "FFFFFF" };
        slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: ACCENT } });
        slide.addText(block.label, { x: 0.4, y: 0.1, w: 12, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
        if (rows.length) {
          const tableRows = [
            block.columns.map((c) => ({ text: c, options: { bold: true, fill: { color: "F3F4F6" } } })),
            ...rows.map((row) => row.map((cell) => ({ text: cell }))),
          ];
          slide.addTable(tableRows, { x: 0.4, y: 1.1, w: 12.5, fontSize: 11, border: { type: "solid", color: "E5E7EB", pt: 0.5 } });
        }
        addAttachmentLinks(slide, attachments, 0.4, 6.0, 12.5);
      } else if (block.type === "photo") {
        const url = value?.type === "photo" ? value.url : "";
        if (!url) return;
        const slide = prs.addSlide();
        slide.background = { color: "FFFFFF" };
        slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: ACCENT } });
        slide.addText(block.label, { x: 0.4, y: 0.1, w: 12, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
        slide.addImage({ path: url, x: 2.5, y: 1.3, w: 8.33, h: 4.5 });
      }
    }

    function addHalfBlockToSlide(slide: PptxSlide, block: ReportTemplateBlock, x: number, w: number) {
      const value = blockData[block.key];
      slide.addShape(prs.ShapeType.rect, { x, y: 0.3, w, h: 0.5, fill: { color: ACCENT } });
      slide.addText(block.label, { x: x + 0.1, y: 0.3, w: w - 0.2, h: 0.5, fontSize: 14, bold: true, color: "FFFFFF", valign: "middle" });
      const contentY = 0.95;
      if (block.type === "text") {
        const content = value?.type === "text" ? value.value : "";
        slide.addText(content, { x, y: contentY, w, h: 5.6, fontSize: 11, color: "111827", valign: "top", wrap: true, paraSpaceAfter: 4 });
        addAttachmentLinks(slide, value?.type === "text" ? value.attachments : undefined, x, 6.7, w);
      } else if (block.type === "table") {
        const rows = value?.type === "table" ? value.rows : [];
        if (rows.length) {
          const tableRows = [
            block.columns.map((c) => ({ text: c, options: { bold: true, fill: { color: "F3F4F6" } } })),
            ...rows.map((row) => row.map((cell) => ({ text: cell }))),
          ];
          slide.addTable(tableRows, { x, y: contentY, w, fontSize: 9, border: { type: "solid", color: "E5E7EB", pt: 0.5 } });
        }
        addAttachmentLinks(slide, value?.type === "table" ? value.attachments : undefined, x, 6.7, w);
      } else if (block.type === "photo") {
        const url = value?.type === "photo" ? value.url : "";
        if (url) slide.addImage({ path: url, x: x + w / 2 - 2, y: contentY, w: 4, h: 4.2 });
      }
    }

    if (report.template) {
      for (const row of groupBlocksIntoRows(report.template.blocks)) {
        if (row.length === 2) {
          const slide = prs.addSlide();
          slide.background = { color: "FFFFFF" };
          addHalfBlockToSlide(slide, row[0], 0.4, 6.0);
          addHalfBlockToSlide(slide, row[1], 6.93, 6.0);
        } else {
          addFullBlockSlide(row[0]);
        }
      }
    } else {
      // Legacy fixed section slides
      for (const def of sectionDefs) {
        const content = sections[def.key];
        if (!content?.trim()) continue;
        const slide = prs.addSlide();
        slide.background = { color: "FFFFFF" };
        slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: ACCENT } });
        slide.addText(def.label, { x: 0.4, y: 0.1, w: 12, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
        slide.addText(content, { x: 0.4, y: 1.1, w: 12.5, h: 4.7, fontSize: 13, color: "111827", valign: "top", wrap: true, paraSpaceAfter: 6 });
      }
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

  function renderAttachments(key: string, kind: "text" | "table", attachments: BlockAttachment[] | undefined) {
    const list = attachments ?? [];
    if (!list.length && !editing) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {list.map((a) => (
          <a
            key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            <Paperclip className="h-3 w-3" />{a.filename}
            {editing && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeBlockAttachment(key, kind, a.url); }}
                className="ml-0.5 text-blue-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </a>
        ))}
        {editing && (
          <label className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-dashed border-gray-300 text-muted-foreground cursor-pointer hover:bg-gray-50">
            {uploadingAttachment === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
            {tr("attachFile" as Parameters<typeof tr>[0])}
            <input
              type="file" multiple className="hidden"
              onChange={(e) => handleBlockAttachmentUpload(key, kind, e.target.files)}
              disabled={uploadingAttachment === key}
            />
          </label>
        )}
      </div>
    );
  }

  function renderTextBlock(block: Extract<ReportTemplateBlock, { type: "text" }>) {
    const value = blockData[block.key];
    const v = value?.type === "text" ? value.value : "";
    return (
      <div key={block.key} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">{block.label}</Label>
          {editing && (
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={() => insertClaimInfoInto(block.key)}>
              <Wand2 className="h-3 w-3 mr-1" />{tr("insertClaimInfo" as Parameters<typeof tr>[0])}
            </Button>
          )}
        </div>
        {editing ? (
          <Textarea
            value={v}
            onChange={(e) => setBlockData((p) => ({ ...p, [block.key]: { type: "text", value: e.target.value, attachments: value?.type === "text" ? value.attachments : undefined } }))}
            rows={4}
            placeholder={block.placeholder}
            className="text-sm"
          />
        ) : (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm whitespace-pre-wrap min-h-[60px]">
            {v || <span className="text-muted-foreground italic">{tr("notEntered" as Parameters<typeof tr>[0])}</span>}
          </div>
        )}
        {renderAttachments(block.key, "text", value?.type === "text" ? value.attachments : undefined)}
      </div>
    );
  }

  function renderTableBlock(block: Extract<ReportTemplateBlock, { type: "table" }>) {
    const value = blockData[block.key];
    const rows = value?.type === "table" ? value.rows : [];
    return (
      <div key={block.key} className="space-y-1.5">
        <Label className="text-sm font-semibold">{block.label}</Label>
        <ReportTableBlock
          columns={block.columns}
          rows={rows}
          editing={editing}
          onChange={(nextRows) => setBlockData((p) => ({ ...p, [block.key]: { type: "table", rows: nextRows, attachments: value?.type === "table" ? value.attachments : undefined } }))}
        />
        {renderAttachments(block.key, "table", value?.type === "table" ? value.attachments : undefined)}
      </div>
    );
  }

  function renderPhotoBlock(block: Extract<ReportTemplateBlock, { type: "photo" }>) {
    const value = blockData[block.key];
    const url = value?.type === "photo" ? value.url : "";
    return (
      <div
        key={block.key}
        className={`space-y-1.5 rounded-xl outline-none ${editing ? "focus:ring-2 focus:ring-blue-200" : ""}`}
        tabIndex={editing ? 0 : undefined}
        onPaste={editing ? (e) => handlePhotoPaste(block.key, e) : undefined}
      >
        <Label className="text-sm font-semibold">{block.label}</Label>
        {url ? (
          <div className="relative inline-block">
            <img src={url} alt={block.label} className="max-h-64 rounded-xl border border-gray-200" />
            {editing && (
              <Button
                type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6"
                onClick={() => setBlockData((p) => ({ ...p, [block.key]: { type: "photo", url: "" } }))}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : editing ? (
          <label className="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-dashed border-gray-300 text-sm text-muted-foreground cursor-pointer hover:bg-gray-50">
            {uploadingPhoto === block.key ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" />{tr("uploadPhoto" as Parameters<typeof tr>[0])}</span>
                <span className="text-xs text-gray-400">{tr("pastePhotoHint" as Parameters<typeof tr>[0])}</span>
              </>
            )}
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => handlePhotoUpload(block.key, e.target.files?.[0])}
              disabled={uploadingPhoto === block.key}
            />
          </label>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-muted-foreground italic min-h-[60px] flex items-center">
            {tr("notEntered" as Parameters<typeof tr>[0])}
          </div>
        )}
      </div>
    );
  }

  function renderBlock(block: ReportTemplateBlock) {
    return block.type === "text" ? renderTextBlock(block)
      : block.type === "table" ? renderTableBlock(block)
      : renderPhotoBlock(block);
  }

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
          <div className="flex items-center gap-2">
            {availableTemplates.length > 0 && (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{tr("autoTemplate" as Parameters<typeof tr>[0])}</SelectItem>
                  <SelectItem value="none">{tr("legacyTemplate" as Parameters<typeof tr>[0])}</SelectItem>
                  {availableTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground shrink-0">{tr("judgment" as Parameters<typeof tr>[0])}</Label>
        <Select
          value={resolutionType ?? ""}
          onValueChange={handleResolutionTypeChange}
          disabled={savingResolution || report?.status === "final"}
        >
          <SelectTrigger className="h-8 text-xs w-56"><SelectValue placeholder={tc("select")} /></SelectTrigger>
          <SelectContent>
            {RESOLUTION_TYPE_KEYS.map((v) => (
              <SelectItem key={v} value={v}>{t(`resolutionTypes.${v}` as Parameters<typeof t>[0])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {savingResolution && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
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

          {/* Blocks: template-driven (width-grouped), or legacy fixed sections */}
          {report.template
            ? groupBlocksIntoRows(report.template.blocks).map((row, idx) => (
                row.length === 2 ? (
                  <div key={idx} className="grid grid-cols-2 gap-4">
                    {row.map((block) => renderBlock(block))}
                  </div>
                ) : renderBlock(row[0])
              ))
            : sectionDefs.map((def) => (
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
              ))
          }

          {/* 레거시 8D 항목 (구버전 보고서에 데이터가 남아있는 경우에만 읽기 전용으로 표시) */}
          {!report.template && LEGACY_FIELDS.some((f) => report.sections[f.key]?.trim()) && (
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
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setSections(report.sections); setBlockData(report.blockData ?? {}); }}>{tc("cancel")}</Button>
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
