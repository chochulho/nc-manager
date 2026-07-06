"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Save, X, Plus, CheckCircle2, AlertTriangle, Trash2, FileSpreadsheet, FileText, Bell } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { WriteGuidePanel } from "@/components/write-guide-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttachmentSection } from "@/components/nc/attachment-section";
import { AdminRecordPanel } from "@/components/nc/admin-record-panel";
import { DocumentChangesSection, type DocChangeItem } from "@/components/capa/document-changes-section";
import { exportNodeToPdf } from "@/lib/pdf/export-node-to-pdf";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface CAPAAction {
  id: string;
  capaId: string;
  actionType: string;
  description: string;
  responsibleUserId: string | null;
  department: string | null;
  responsibleName: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  evidence: string | null;
  status: string;
  createdAt: Date;
}

interface CAPA {
  id: string;
  capaNumber: string;
  orgId: string;
  sourceType: string;
  sourceId: string;
  methodology: string;
  title: string;
  problemStatement: string | null;
  d1Team: unknown;
  d2Description: string | null;
  d3InterimContainment: string | null;
  d4RootCause: unknown;
  d5PermanentActions: unknown;
  d6Implementation: unknown;
  d7Prevention: unknown;
  d8Recognition: unknown;
  status: string;
  championUserId: string | null;
  effectivenessReviewDueAt: Date | null;
  effectivenessReviewedAt: Date | null;
  effectivenessReviewerUserId: string | null;
  effectivenessVerdict: string | null;
  effectivenessNote: string | null;
  recurrenceConfirmed: boolean | null;
  recurrenceNote: string | null;
  fmeaRef: string | null;
  changeRef: string | null;
  docChanges: DocChangeItem[] | null;
  createdByName: string | null;
  closedAt: Date | null;
  createdAt: Date;
}

interface OrgMember {
  id: string;
  name: string;
  email: string;
}

interface Props {
  capa: CAPA;
  actions: CAPAAction[];
  sourceNumber: string;
  sourceTitle: string;
  members?: OrgMember[];
  isOrgAdmin?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-orange-50 text-orange-700 border-orange-200",
  actions_implemented: "bg-purple-50 text-purple-700 border-purple-200",
  effectiveness_monitoring: "bg-yellow-50 text-yellow-700 border-yellow-200",
  closed: "bg-green-50 text-green-700 border-green-200",
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  correction: "bg-red-50 text-red-700",
  corrective: "bg-blue-50 text-blue-700",
  preventive: "bg-green-50 text-green-700",
};

const ALL_STATUSES = ["open", "in_progress", "actions_implemented", "effectiveness_monitoring", "closed"] as const;

export function CAPADetailClient({ capa: initialCapa, actions: initialActions, sourceNumber, sourceTitle, members = [], isOrgAdmin = false }: Props) {
  const router = useRouter();
  const t = useTranslations("capa");
  const tCommon = useTranslations("common");
  const [capa, setCapa] = useState<CAPA>(initialCapa);
  const [actions, setActions] = useState<CAPAAction[]>(initialActions);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: capa.title,
    problemStatement: capa.problemStatement ?? "",
    d1Team: typeof capa.d1Team === "string" ? capa.d1Team : "",
    d2Description: capa.d2Description ?? "",
    d3InterimContainment: capa.d3InterimContainment ?? "",
    d4RootCause: typeof capa.d4RootCause === "object" && capa.d4RootCause
      ? (capa.d4RootCause as Array<{why: string; because: string}>)
      : Array.from({ length: 5 }, () => ({ why: "", because: "" })),
    simpleRootCause: typeof capa.d4RootCause === "string" ? capa.d4RootCause : "",
    d5PermanentActions: Array.isArray(capa.d5PermanentActions) && (capa.d5PermanentActions as unknown[]).length > 0
      ? (capa.d5PermanentActions as Array<{description: string; responsible: string; dueDate: string}>)
      : [{ description: "", responsible: "", dueDate: "" }],
    d6Implementation: Array.isArray(capa.d6Implementation) && (capa.d6Implementation as unknown[]).length > 0
      ? (capa.d6Implementation as Array<{description: string; evidence: string; verifiedAt: string}>)
      : [{ description: "", evidence: "", verifiedAt: "" }],
    d8Recognition: typeof capa.d8Recognition === "string" ? capa.d8Recognition : "",
    fmeaRef: capa.fmeaRef ?? "",
    changeRef: capa.changeRef ?? "",
    docChanges: capa.docChanges ?? [],
    effectivenessReviewDueAt: capa.effectivenessReviewDueAt
      ? new Date(capa.effectivenessReviewDueAt).toISOString().slice(0, 10)
      : "",
    effectivenessReviewerUserId: capa.effectivenessReviewerUserId ?? "",
    effectivenessVerdict: capa.effectivenessVerdict ?? "",
    effectivenessNote: capa.effectivenessNote ?? "",
    recurrenceConfirmed: capa.recurrenceConfirmed === null ? "" : capa.recurrenceConfirmed ? "true" : "false",
    recurrenceNote: capa.recurrenceNote ?? "",
    status: capa.status,
  });

  // Action 추가용 상태
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState({ actionType: "corrective", description: "", department: "", responsibleName: "", dueAt: "" });
  const [addingAction, setAddingAction] = useState(false);
  // 완료일 선택 상태
  const [completingAction, setCompletingAction] = useState<{ id: string; date: string } | null>(null);

  function setF(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      if (form.status === "closed" && !form.effectivenessVerdict) {
        toast.error(tCommon("required"));
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        title: form.title,
        problemStatement: form.problemStatement || null,
        d1Team: isSimpleCapa ? null : (form.d1Team || null),
        d2Description: form.d2Description || null,
        d3InterimContainment: form.d3InterimContainment || null,
        d4RootCause: isSimpleCapa ? (form.simpleRootCause || null) : form.d4RootCause,
        d5PermanentActions: isSimpleCapa ? null : form.d5PermanentActions,
        d6Implementation: isSimpleCapa ? null : form.d6Implementation,
        d8Recognition: isSimpleCapa ? null : (form.d8Recognition || null),
        fmeaRef: form.fmeaRef || null,
        changeRef: form.changeRef || null,
        docChanges: (form.docChanges as DocChangeItem[]).length > 0 ? form.docChanges : null,
        effectivenessReviewDueAt: form.effectivenessReviewDueAt ? new Date(form.effectivenessReviewDueAt) : null,
        effectivenessReviewerUserId: form.effectivenessReviewerUserId || null,
        effectivenessVerdict: form.effectivenessVerdict || null,
        effectivenessNote: form.effectivenessNote || null,
        recurrenceConfirmed: form.recurrenceConfirmed === "" ? null : form.recurrenceConfirmed === "true",
        recurrenceNote: form.recurrenceNote || null,
        status: form.status,
      };

      const res = await fetch(`/api/nc/capa/${capa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error(tCommon("error")); return; }
      const updated = await res.json();
      setCapa(updated);
      setEditing(false);
      toast.success(tCommon("success"));
    } finally {
      setSaving(false);
    }
  }

  function extractText(val: unknown): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val)) {
      return (val as Array<Record<string, unknown>>)
        .map((row) => Object.values(row).filter(Boolean).join(" | "))
        .join("\n");
    }
    return "";
  }

  async function handleDownloadExcel() {
    const XLSX = await import("xlsx");

    // ── Sheet 1: CAPA 기본 정보 ──
    const info = [
      ["항목", "내용"],
      ["CAPA 번호", capa.capaNumber],
      ["제목", capa.title],
      ["방법론", capa.methodology === "8d" ? "8D" : "Simple CAPA"],
      ["상태", capa.status],
      ["출처", `${sourceNumber} — ${sourceTitle}`],
      ["생성일", new Date(capa.createdAt).toLocaleDateString()],
      [],
      ["문제점 (Problem Statement)", capa.problemStatement ?? ""],
      [],
      ["D2. 문제 기술", capa.d2Description ?? ""],
      ["D3. 봉쇄조치", capa.d3InterimContainment ?? ""],
      ["D4. 근본원인", extractText(capa.d4RootCause)],
      ["D7. 예방조치", extractText(capa.d7Prevention)],
      ["D8. 팀 인정/종결", extractText(capa.d8Recognition)],
      [],
      ["FMEA 참조", capa.fmeaRef ?? ""],
      ["변경점 참조", capa.changeRef ?? ""],
    ];

    // ── Sheet 2: 조치 항목 ──
    const actionRows = [
      ["유형", "내용", "담당자 ID", "기한", "완료일", "상태", "근거"],
      ...actions.map((a) => [
        a.actionType === "correction" ? "시정" : a.actionType === "corrective" ? "시정조치" : "예방조치",
        a.description,
        a.responsibleUserId ?? "",
        a.dueAt ? new Date(a.dueAt).toLocaleDateString() : "",
        a.completedAt ? new Date(a.completedAt).toLocaleDateString() : "",
        a.status,
        a.evidence ?? "",
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(info);
    const ws2 = XLSX.utils.aoa_to_sheet(actionRows);

    ws1["!cols"] = [{ wch: 28 }, { wch: 60 }];
    ws2["!cols"] = [{ wch: 12 }, { wch: 50 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];

    XLSX.utils.book_append_sheet(wb, ws1, "CAPA 기본정보");
    XLSX.utils.book_append_sheet(wb, ws2, "조치항목");
    XLSX.writeFile(wb, `CAPA_${capa.capaNumber}.xlsx`);
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return;
    setExportingPdf(true);
    try {
      await exportNodeToPdf(printRef.current, `CAPA_${capa.capaNumber}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }

  async function addAction() {
    if (!newAction.description) { toast.error(tCommon("required")); return; }
    setAddingAction(true);
    try {
      const res = await fetch(`/api/nc/capa/${capa.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: newAction.actionType,
          description: newAction.description,
          department: newAction.department || null,
          responsibleName: newAction.responsibleName || null,
          dueAt: newAction.dueAt || null,
        }),
      });
      if (!res.ok) { toast.error(tCommon("error")); return; }
      const created = await res.json();
      setActions((prev) => [...prev, created]);
      setNewAction({ actionType: "corrective", description: "", department: "", responsibleName: "", dueAt: "" });
      setShowAddAction(false);
    } finally {
      setAddingAction(false);
    }
  }

  async function updateActionStatus(actionId: string, status: string, completedAt?: string) {
    const body: Record<string, unknown> = { status };
    if (completedAt) body.completedAt = completedAt;
    const res = await fetch(`/api/nc/capa/${capa.id}/actions/${actionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast.error(tCommon("error")); return; }
    const updated = await res.json();
    setActions((prev) => prev.map((a) => (a.id === actionId ? updated : a)));
  }

  async function deleteAction(actionId: string) {
    if (!confirm(tCommon("confirm"))) return;
    const res = await fetch(`/api/nc/capa/${capa.id}/actions/${actionId}`, { method: "DELETE" });
    if (res.ok) setActions((prev) => prev.filter((a) => a.id !== actionId));
  }

  const sourceHref = capa.sourceType === "internal_nc"
    ? `/internal-nc/${capa.sourceId}`
    : capa.sourceType === "customer_complaint"
    ? `/complaints/${capa.sourceId}`
    : null;

  const isSimpleCapa = capa.methodology === "simple_capa";
  const isEffectivenessPhase = (editing ? form.status : capa.status) === "effectiveness_monitoring";
  const whyRows = form.d4RootCause as Array<{ why: string; because: string }>;
  const capaWhyRows = Array.isArray(capa.d4RootCause)
    ? (capa.d4RootCause as Array<{ why: string; because: string }>)
    : [];
  const capaD5 = Array.isArray(capa.d5PermanentActions)
    ? (capa.d5PermanentActions as Array<{ description: string; responsible: string; dueDate: string }>)
    : [];
  const capaD6 = Array.isArray(capa.d6Implementation)
    ? (capa.d6Implementation as Array<{ description: string; evidence: string; verifiedAt: string }>)
    : [];

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/capa"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="page-title">{capa.capaNumber}</h1>
            <p className="text-sm text-muted-foreground">{capa.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <Button variant="ghost" size="sm" onClick={handleDownloadExcel} title="Excel 다운로드">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownloadPdf} disabled={exportingPdf} title="PDF 다운로드">
                <span className="text-[10px] font-bold text-red-600">PDF</span>
              </Button>
              <Link href={`/q-alerts/new?capaId=${capa.id}`}>
                <Button variant="outline" size="sm" title="Q-Alert 초안 생성" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                  <Bell className="h-3.5 w-3.5 mr-1" /> Q-Alert
                </Button>
              </Link>
            </>
          )}
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-4 w-4 mr-1" /> {tCommon("cancel")}
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? tCommon("saving") : tCommon("save")}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" /> {tCommon("edit")}
            </Button>
          )}
        </div>
      </div>

      <div ref={printRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측 본문 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">{t("basicInfo")}</h2>
            {editing ? (
              <>
                <div>
                  <Label>{tCommon("title")} *</Label>
                  <Input value={form.title} onChange={(e) => setF("title", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>{t("problemStatement")}</Label>
                  <Textarea value={form.problemStatement} onChange={(e) => setF("problemStatement", e.target.value)} rows={3} className="mt-1" />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">{capa.title}</p>
                {capa.problemStatement && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{capa.problemStatement}</p>}
              </>
            )}
          </div>

          {/* 분석 섹션 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">
              {capa.methodology === "8d" ? t("analysis") : t("analysisGeneral")}
            </h2>

            {isSimpleCapa ? (
              <>
                {/* Simple CAPA: 봉쇄조치 */}
                <div className="border-l-2 border-yellow-400 pl-3">
                  <p className="text-xs font-bold text-yellow-600 mb-1">{t("scContainment")}</p>
                  {editing ? (
                    <Textarea value={form.d3InterimContainment} onChange={(e) => setF("d3InterimContainment", e.target.value)} rows={2} placeholder={t("d3Placeholder")} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{capa.d3InterimContainment || "—"}</p>
                  )}
                </div>

                {/* Simple CAPA: 근본 원인 */}
                <div className="border-l-2 border-orange-400 pl-3">
                  <p className="text-xs font-bold text-orange-600 mb-1">{t("scRootCause")}</p>
                  {editing ? (
                    <Textarea value={form.simpleRootCause} onChange={(e) => setF("simpleRootCause", e.target.value)} rows={3} placeholder={t("scRootCausePlaceholder")} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(typeof capa.d4RootCause === "string" ? capa.d4RootCause : null) || "—"}</p>
                  )}
                </div>

                {/* Simple CAPA: 예방 및 연계 */}
                <div className="border-l-2 border-purple-400 pl-3">
                  <p className="text-xs font-bold text-purple-600 mb-2">{t("scPrevention")}</p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">{t("d7FmeaRef")}</Label>
                      {editing ? (
                        <Input value={form.fmeaRef} onChange={(e) => setF("fmeaRef", e.target.value)} placeholder={t("d7FmeaPlaceholder")} className="mt-1 text-sm" />
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">{capa.fmeaRef || "—"}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">{t("d7ChangeRef")}</Label>
                      {editing ? (
                        <Input value={form.changeRef} onChange={(e) => setF("changeRef", e.target.value)} placeholder={t("d7ChangePlaceholder")} className="mt-1 text-sm" />
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">{capa.changeRef || "—"}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">{t("docChanges")}</Label>
                      <div className="mt-1">
                        <DocumentChangesSection
                          items={form.docChanges as DocChangeItem[]}
                          editing={editing}
                          onChange={(items) => setF("docChanges", items)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* D1 Team */}
                <div className="border-l-2 border-blue-400 pl-3">
                  <p className="text-xs font-bold text-blue-600 mb-1">{t("d1")}</p>
                  {editing ? (
                    <Textarea value={form.d1Team} onChange={(e) => setF("d1Team", e.target.value)} rows={2} placeholder={t("d1Placeholder")} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(typeof capa.d1Team === "string" ? capa.d1Team : null) || "—"}</p>
                  )}
                </div>

                {/* D2 Problem */}
                <div className="border-l-2 border-blue-400 pl-3">
                  <p className="text-xs font-bold text-blue-600 mb-1">{t("d2")}</p>
                  {editing ? (
                    <Textarea value={form.d2Description} onChange={(e) => setF("d2Description", e.target.value)} rows={3} placeholder={t("d2Placeholder")} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{capa.d2Description || "—"}</p>
                  )}
                </div>

                {/* D3 Containment */}
                <div className="border-l-2 border-yellow-400 pl-3">
                  <p className="text-xs font-bold text-yellow-600 mb-1">{t("d3")}</p>
                  {editing ? (
                    <Textarea value={form.d3InterimContainment} onChange={(e) => setF("d3InterimContainment", e.target.value)} rows={2} placeholder={t("d3Placeholder")} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{capa.d3InterimContainment || "—"}</p>
                  )}
                </div>

                {/* D4 Root Cause - 5Why */}
                <div className="border-l-2 border-orange-400 pl-3">
                  <p className="text-xs font-bold text-orange-600 mb-2">{t("d4")}</p>
                  {editing ? (
                    <div className="space-y-2">
                      {whyRows.map((row, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <Input
                            value={row.why}
                            onChange={(e) => {
                              const updated = [...whyRows];
                              updated[i] = { ...updated[i], why: e.target.value };
                              setF("d4RootCause", updated);
                            }}
                            placeholder={`Why ${i + 1}`}
                            className="text-sm"
                          />
                          <Input
                            value={row.because}
                            onChange={(e) => {
                              const updated = [...whyRows];
                              updated[i] = { ...updated[i], because: e.target.value };
                              setF("d4RootCause", updated);
                            }}
                            placeholder="Because..."
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {capaWhyRows.filter((r) => r.why || r.because).map((row, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-orange-700">Why {i + 1}:</span>{" "}
                          <span className="text-muted-foreground">{row.why || "—"}</span>
                          {row.because && <span className="text-gray-500"> → {row.because}</span>}
                        </div>
                      ))}
                      {capaWhyRows.every((r) => !r.why && !r.because) && (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  )}
                </div>

                {/* D5 Permanent Actions */}
                <div className="border-l-2 border-red-400 pl-3">
                  <p className="text-xs font-bold text-red-600 mb-2">{t("d5")}</p>
                  {editing ? (
                    <div className="space-y-2">
                      {(form.d5PermanentActions as Array<{description: string; responsible: string; dueDate: string}>).map((row, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 items-center">
                          <Input
                            value={row.description}
                            onChange={(e) => {
                              const updated = [...form.d5PermanentActions as Array<{description: string; responsible: string; dueDate: string}>];
                              updated[i] = { ...updated[i], description: e.target.value };
                              setF("d5PermanentActions", updated);
                            }}
                            placeholder={t("d5ColAction")}
                            className="text-sm col-span-1"
                          />
                          <Input
                            value={row.responsible}
                            onChange={(e) => {
                              const updated = [...form.d5PermanentActions as Array<{description: string; responsible: string; dueDate: string}>];
                              updated[i] = { ...updated[i], responsible: e.target.value };
                              setF("d5PermanentActions", updated);
                            }}
                            placeholder={t("d5ColResponsible")}
                            className="text-sm"
                          />
                          <div className="flex gap-1 items-center">
                            <Input
                              type="date"
                              value={row.dueDate}
                              onChange={(e) => {
                                const updated = [...form.d5PermanentActions as Array<{description: string; responsible: string; dueDate: string}>];
                                updated[i] = { ...updated[i], dueDate: e.target.value };
                                setF("d5PermanentActions", updated);
                              }}
                              className="text-sm flex-1"
                            />
                            {(form.d5PermanentActions as Array<unknown>).length > 1 && (
                              <Button
                                type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                                onClick={() => {
                                  const updated = (form.d5PermanentActions as Array<unknown>).filter((_, idx) => idx !== i);
                                  setF("d5PermanentActions", updated);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setF("d5PermanentActions", [...(form.d5PermanentActions as Array<unknown>), { description: "", responsible: "", dueDate: "" }])}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> {tCommon("addRow")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {capaD5.filter((r) => r.description).map((row, i) => (
                        <div key={i} className="text-sm flex gap-3">
                          <span className="font-medium text-red-700 shrink-0">{i + 1}.</span>
                          <span className="flex-1">{row.description}</span>
                          {row.responsible && <span className="text-muted-foreground shrink-0">{row.responsible}</span>}
                          {row.dueDate && <span className="text-muted-foreground shrink-0">{row.dueDate}</span>}
                        </div>
                      ))}
                      {!capaD5.some((r) => r.description) && (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  )}
                </div>

                {/* D6 Implementation */}
                <div className="border-l-2 border-teal-400 pl-3">
                  <p className="text-xs font-bold text-teal-600 mb-2">{t("d6")}</p>
                  {editing ? (
                    <div className="space-y-2">
                      {(form.d6Implementation as Array<{description: string; evidence: string; verifiedAt: string}>).map((row, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 items-center">
                          <Input
                            value={row.description}
                            onChange={(e) => {
                              const updated = [...form.d6Implementation as Array<{description: string; evidence: string; verifiedAt: string}>];
                              updated[i] = { ...updated[i], description: e.target.value };
                              setF("d6Implementation", updated);
                            }}
                            placeholder={t("d6ColAction")}
                            className="text-sm"
                          />
                          <Input
                            value={row.evidence}
                            onChange={(e) => {
                              const updated = [...form.d6Implementation as Array<{description: string; evidence: string; verifiedAt: string}>];
                              updated[i] = { ...updated[i], evidence: e.target.value };
                              setF("d6Implementation", updated);
                            }}
                            placeholder={t("d6ColEvidence")}
                            className="text-sm"
                          />
                          <div className="flex gap-1 items-center">
                            <Input
                              type="date"
                              value={row.verifiedAt}
                              onChange={(e) => {
                                const updated = [...form.d6Implementation as Array<{description: string; evidence: string; verifiedAt: string}>];
                                updated[i] = { ...updated[i], verifiedAt: e.target.value };
                                setF("d6Implementation", updated);
                              }}
                              className="text-sm flex-1"
                            />
                            {(form.d6Implementation as Array<unknown>).length > 1 && (
                              <Button
                                type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                                onClick={() => {
                                  const updated = (form.d6Implementation as Array<unknown>).filter((_, idx) => idx !== i);
                                  setF("d6Implementation", updated);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setF("d6Implementation", [...(form.d6Implementation as Array<unknown>), { description: "", evidence: "", verifiedAt: "" }])}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> {tCommon("addRow")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {capaD6.filter((r) => r.description).map((row, i) => (
                        <div key={i} className="text-sm flex gap-3">
                          <span className="font-medium text-teal-700 shrink-0">{i + 1}.</span>
                          <span className="flex-1">{row.description}</span>
                          {row.evidence && <span className="text-muted-foreground shrink-0">{row.evidence}</span>}
                          {row.verifiedAt && <span className="text-muted-foreground shrink-0">{row.verifiedAt}</span>}
                        </div>
                      ))}
                      {!capaD6.some((r) => r.description) && (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  )}
                </div>

                {/* D7 Prevention */}
                <div className="border-l-2 border-purple-400 pl-3">
                  <p className="text-xs font-bold text-purple-600 mb-2">{t("d7")}</p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">{t("d7FmeaRef")}</Label>
                      {editing ? (
                        <Input value={form.fmeaRef} onChange={(e) => setF("fmeaRef", e.target.value)} placeholder={t("d7FmeaPlaceholder")} className="mt-1 text-sm" />
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">{capa.fmeaRef || "—"}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">{t("d7ChangeRef")}</Label>
                      {editing ? (
                        <Input value={form.changeRef} onChange={(e) => setF("changeRef", e.target.value)} placeholder={t("d7ChangePlaceholder")} className="mt-1 text-sm" />
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">{capa.changeRef || "—"}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">{t("docChanges")}</Label>
                      <div className="mt-1">
                        <DocumentChangesSection
                          items={form.docChanges as DocChangeItem[]}
                          editing={editing}
                          onChange={(items) => setF("docChanges", items)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* D8 Recognition */}
                <div className="border-l-2 border-green-400 pl-3">
                  <p className="text-xs font-bold text-green-600 mb-1">{t("d8")}</p>
                  {editing ? (
                    <Textarea value={form.d8Recognition} onChange={(e) => setF("d8Recognition", e.target.value)} rows={2} placeholder={t("d8Placeholder")} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(typeof capa.d8Recognition === "string" ? capa.d8Recognition : null) || "—"}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 조치 항목 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">{t("actions")} ({actions.length})</h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddAction(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {t("addAction")}
              </Button>
            </div>

            {showAddAction && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t("actionType")}</Label>
                    <Select value={newAction.actionType} onValueChange={(v) => setNewAction((p) => ({ ...p, actionType: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["correction", "corrective", "preventive"] as const).map((v) => (
                          <SelectItem key={v} value={v}>
                            {t(`actionTypes.${v}` as Parameters<typeof t>[0])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("actionDue")}</Label>
                    <Input type="date" value={newAction.dueAt} onChange={(e) => setNewAction((p) => ({ ...p, dueAt: e.target.value }))} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t("actionDepartment")}</Label>
                    <Input value={newAction.department} onChange={(e) => setNewAction((p) => ({ ...p, department: e.target.value }))} placeholder={t("actionDepartmentPlaceholder")} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">{t("actionResponsible")}</Label>
                    <Input value={newAction.responsibleName} onChange={(e) => setNewAction((p) => ({ ...p, responsibleName: e.target.value }))} placeholder={t("actionResponsiblePlaceholder")} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("actionDescription")}</Label>
                  <Textarea value={newAction.description} onChange={(e) => setNewAction((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder={t("actionDescPlaceholder")} className="mt-1 text-sm" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowAddAction(false)}>{tCommon("cancel")}</Button>
                  <Button size="sm" onClick={addAction} disabled={addingAction}>
                    {addingAction ? tCommon("adding") : tCommon("add")}
                  </Button>
                </div>
              </div>
            )}

            {actions.length === 0 && !showAddAction && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noActions")}</p>
            )}

            <div className="space-y-2">
              {actions.map((action) => (
                <div key={action.id} className="rounded-lg border border-gray-100 hover:bg-gray-50 group">
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-semibold mt-0.5 ${ACTION_TYPE_COLORS[action.actionType] ?? "bg-gray-100 text-gray-600"}`}>
                      {t(`actionTypes.${action.actionType}` as Parameters<typeof t>[0])}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {action.description}
                      </p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {(action.department || action.responsibleName) && (
                          <p className="text-xs text-muted-foreground">
                            {[action.department, action.responsibleName].filter(Boolean).join(" / ")}
                          </p>
                        )}
                        {action.dueAt && (
                          <p className="text-xs text-muted-foreground">{t("actionDue")}: {formatDate(action.dueAt)}</p>
                        )}
                        {action.completedAt && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {t("actionCompleted")}: {formatDate(action.completedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Select
                        value={completingAction?.id === action.id ? "completed" : action.status}
                        onValueChange={(v) => {
                          if (v === "completed") {
                            setCompletingAction({ id: action.id, date: new Date().toISOString().slice(0, 10) });
                          } else {
                            setCompletingAction(null);
                            updateActionStatus(action.id, v);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["open", "in_progress", "completed", "cancelled"] as const).map((v) => (
                            <SelectItem key={v} value={v} className="text-xs">
                              {t(`actionStatuses.${v}` as Parameters<typeof t>[0])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteAction(action.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {completingAction?.id === action.id && (
                    <div className="mx-3 mb-2.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-green-700 font-medium">{t("actionCompleted")}:</span>
                      <Input
                        type="date"
                        value={completingAction.date}
                        onChange={(e) => setCompletingAction((prev) => prev ? { ...prev, date: e.target.value } : null)}
                        className="h-7 text-xs w-36"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          updateActionStatus(action.id, "completed", completingAction.date);
                          setCompletingAction(null);
                        }}
                      >
                        {tCommon("confirm")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCompletingAction(null)}
                      >
                        {tCommon("cancel")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 유효성 평가 */}
          <div className={`bg-white rounded-2xl border p-5 space-y-4 ${isEffectivenessPhase ? "border-yellow-300 ring-1 ring-yellow-200" : "border-gray-200"}`}>
            <h2 className="section-title flex items-center gap-2">
              {t("effectiveness")}
              {isEffectivenessPhase && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">{t("effectivenessRequired")}</span>}
            </h2>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>{t("effectivenessReviewDue")}</Label>
                  <Input type="date" value={form.effectivenessReviewDueAt} onChange={(e) => setF("effectivenessReviewDueAt", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>{t("effectivenessReviewer")}</Label>
                  <Select value={form.effectivenessReviewerUserId || "__none__"} onValueChange={(v) => setF("effectivenessReviewerUserId", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t("effectivenessReviewerPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("effectivenessReviewerPlaceholder")}</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("effectivenessVerdict")}</Label>
                  <div className="flex gap-3 mt-2">
                    {(["effective", "partial", "not_effective"] as const).map((v) => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="verdict"
                          value={v}
                          checked={form.effectivenessVerdict === v}
                          onChange={() => setF("effectivenessVerdict", v)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">
                          {v === "effective" ? t("verdictEffective") : v === "partial" ? t("verdictPartial") : t("verdictNotEffective")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>{t("effectivenessNote")}</Label>
                  <Textarea value={form.effectivenessNote} onChange={(e) => setF("effectivenessNote", e.target.value)} rows={2} placeholder={t("effectivenessNotePlaceholder")} className="mt-1" />
                </div>
                <div>
                  <Label>{t("recurrence")}</Label>
                  <div className="flex gap-3 mt-2">
                    {([{ v: "false", key: "recurrenceNone" }, { v: "true", key: "recurrenceFound" }] as const).map(({ v, key }) => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrence"
                          value={v}
                          checked={form.recurrenceConfirmed === v}
                          onChange={() => setF("recurrenceConfirmed", v)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{t(key as Parameters<typeof t>[0])}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {form.recurrenceConfirmed === "true" && (
                  <div>
                    <Label>{t("recurrenceNote")}</Label>
                    <Textarea value={form.recurrenceNote} onChange={(e) => setF("recurrenceNote", e.target.value)} rows={2} placeholder={t("recurrenceNote")} className="mt-1" />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("effectivenessReviewDue")}</p>
                    <p>{capa.effectivenessReviewDueAt ? formatDate(capa.effectivenessReviewDueAt) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("effectivenessReviewedAt")}</p>
                    <p>{capa.effectivenessReviewedAt ? formatDate(capa.effectivenessReviewedAt) : "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("effectivenessReviewer")}</p>
                  <p>{capa.effectivenessReviewerUserId ? (members.find((m) => m.id === capa.effectivenessReviewerUserId)?.name ?? "—") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("effectivenessVerdict")}</p>
                  <p className="font-medium">
                    {capa.effectivenessVerdict === "effective" ? t("verdictEffective")
                      : capa.effectivenessVerdict === "partial" ? t("verdictPartial")
                      : capa.effectivenessVerdict === "not_effective" ? t("verdictNotEffective")
                      : "—"}
                  </p>
                </div>
                {capa.effectivenessNote && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("effectivenessNote")}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{capa.effectivenessNote}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{t("recurrence")}</p>
                  <p>{capa.recurrenceConfirmed === null ? "—" : capa.recurrenceConfirmed ? t("recurrenceStatus.found" as Parameters<typeof t>[0]) : t("recurrenceStatus.none" as Parameters<typeof t>[0])}</p>
                </div>
                {capa.recurrenceNote && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("recurrenceNote")}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{capa.recurrenceNote}</p>
                  </div>
                )}
              </div>
            )}

            {capa.effectivenessVerdict === "not_effective" && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t("notEffectiveWarning")}</span>
              </div>
            )}
          </div>

          {/* 첨부파일 */}
          <AttachmentSection entityType="capa" entityId={capa.id} />
        </div>

        {/* 우측 패널 */}
        <div className="space-y-5">
          {/* 상태 패널 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("capaNumber")}</span>
              <span className="font-mono text-sm font-bold">{capa.capaNumber}</span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t("currentStatus")}</p>
              {editing ? (
                <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`statuses.${s}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_COLORS[capa.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                  {t(`statuses.${capa.status}` as Parameters<typeof t>[0])}
                </span>
              )}
            </div>

            {capa.status === "closed" && capa.closedAt && (
              <p className="text-xs text-muted-foreground text-center">{t("closedAt")}: {formatDate(capa.closedAt)}</p>
            )}
          </div>

          {/* 출처 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title">{t("source")}</h2>
            <div>
              <p className="text-xs text-muted-foreground">{t(`sourceTypes.${capa.sourceType}` as Parameters<typeof t>[0])}</p>
              {sourceNumber && sourceHref ? (
                <Link href={sourceHref} className="text-sm font-semibold text-primary hover:underline font-mono">
                  {sourceNumber}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">{capa.sourceId}</p>
              )}
              {sourceTitle && <p className="text-xs text-muted-foreground mt-0.5">{sourceTitle}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("methodology")}</p>
              <p className="text-sm font-medium">
                {t(`methodologies.${capa.methodology}` as Parameters<typeof t>[0])}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("registeredAt")}</p>
              <p className="text-sm">{formatDate(capa.createdAt)}</p>
            </div>
            {capa.createdByName && (
              <div>
                <p className="text-xs text-muted-foreground">{tCommon("createdBy")}</p>
                <p className="text-sm font-medium">{capa.createdByName}</p>
              </div>
            )}
          </div>

          {isOrgAdmin && (
            <AdminRecordPanel
              currentNumber={capa.capaNumber}
              deleteApiUrl={`/api/nc/capa/${capa.id}`}
              renumberApiUrl={`/api/nc/capa/${capa.id}/renumber`}
              listHref="/capa"
              onRenumbered={(newNumber) => setCapa((prev) => ({ ...prev, capaNumber: newNumber }))}
            />
          )}
        </div>
      </div>
      </div>
      <WriteGuidePanel type="capa" methodology={capa.methodology} className="mt-[4.5rem]" />
    </div>
  );
}
