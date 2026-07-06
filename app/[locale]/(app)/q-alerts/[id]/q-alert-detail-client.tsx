"use client";

import { useRef, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Edit2, Save, X, Bell, CheckCircle2,
  Archive, Eye, FileText, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttachmentSection } from "@/components/nc/attachment-section";
import { AdminRecordPanel } from "@/components/nc/admin-record-panel";
import { exportNodeToPdf } from "@/lib/pdf/export-node-to-pdf";
import { formatDate } from "@/lib/utils";

interface QAlert {
  id: string;
  alertNumber: string;
  title: string;
  problemSummary: string | null;
  rootCause: string | null;
  prevention: string | null;
  targetProcess: string | null;
  sourceType: string | null;
  sourceId: string | null;
  sourceNumber: string | null;
  status: string;
  postedAt: Date | null;
  expiresAt: Date | null;
  trainedAt: Date | null;
  trainedByName: string | null;
  trainingNote: string | null;
  createdByName: string | null;
  createdAt: Date;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:    { label: "초안",    className: "bg-gray-100 text-gray-700" },
  reviewed: { label: "검토완료", className: "bg-blue-50 text-blue-700" },
  posted:   { label: "게시중",   className: "bg-green-50 text-green-700" },
  archived: { label: "보관",    className: "bg-amber-50 text-amber-700" },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft:    <FileText className="h-3.5 w-3.5" />,
  reviewed: <Eye className="h-3.5 w-3.5" />,
  posted:   <CheckCircle2 className="h-3.5 w-3.5" />,
  archived: <Archive className="h-3.5 w-3.5" />,
};

const SOURCE_HREF: Record<string, (id: string) => string> = {
  capa: (id) => `/capa/${id}`,
  internal_nc: (id) => `/internal-nc/${id}`,
  customer_complaint: (id) => `/complaints/${id}`,
};

export function QAlertDetailClient({ alert: initial, isOrgAdmin = false }: { alert: QAlert; isOrgAdmin?: boolean }) {
  const [alert, setAlert] = useState<QAlert>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: alert.title,
    problemSummary: alert.problemSummary ?? "",
    rootCause: alert.rootCause ?? "",
    prevention: alert.prevention ?? "",
    targetProcess: alert.targetProcess ?? "",
    status: alert.status,
    postedAt: alert.postedAt ? new Date(alert.postedAt).toISOString().slice(0, 10) : "",
    expiresAt: alert.expiresAt ? new Date(alert.expiresAt).toISOString().slice(0, 10) : "",
    trainedAt: alert.trainedAt ? new Date(alert.trainedAt).toISOString().slice(0, 10) : "",
    trainedByName: alert.trainedByName ?? "",
    trainingNote: alert.trainingNote ?? "",
  });

  function setF(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/nc/q-alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          problemSummary: form.problemSummary || null,
          rootCause: form.rootCause || null,
          prevention: form.prevention || null,
          targetProcess: form.targetProcess || null,
          status: form.status,
          postedAt: form.postedAt ? new Date(form.postedAt) : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
          trainedAt: form.trainedAt ? new Date(form.trainedAt) : null,
          trainedByName: form.trainedByName || null,
          trainingNote: form.trainingNote || null,
        }),
      });
      if (!res.ok) { toast.error("저장에 실패했습니다."); return; }
      const updated = await res.json();
      setAlert(updated);
      setEditing(false);
      toast.success("저장됐습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    if (!contentRef.current) return;
    setExportingPdf(true);
    try {
      await exportNodeToPdf(contentRef.current, `QAlert_${alert.alertNumber}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }

  const cfg = STATUS_CONFIG[alert.status] ?? STATUS_CONFIG.draft;
  const sourceHref = alert.sourceType && alert.sourceId ? SOURCE_HREF[alert.sourceType]?.(alert.sourceId) : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/q-alerts">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              {alert.alertNumber}
            </h1>
            <p className="text-sm text-muted-foreground">{alert.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <Button variant="ghost" size="sm" onClick={handleDownloadPdf} disabled={exportingPdf} title="PDF 게시물 다운로드">
                <Printer className="h-4 w-4 text-orange-600" />
              </Button>
            </>
          )}
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-4 w-4 mr-1" /> 취소
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "저장 중..." : "저장"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" /> 편집
            </Button>
          )}
        </div>
      </div>

      <div ref={contentRef} className="space-y-5">
        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Q-Alert 내용</h2>
            {editing ? (
              <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                    <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.className}`}>
                {STATUS_ICONS[alert.status]} {cfg.label}
              </span>
            )}
          </div>

          {editing ? (
            <div>
              <Label>제목 *</Label>
              <Input value={form.title} onChange={(e) => setF("title", e.target.value)} className="mt-1" />
            </div>
          ) : (
            <p className="text-sm font-semibold">{alert.title}</p>
          )}

          {/* 문제 요약 */}
          <div className="border-l-4 border-red-400 pl-3">
            <p className="text-xs font-bold text-red-600 mb-1">문제 요약</p>
            {editing ? (
              <Textarea value={form.problemSummary} onChange={(e) => setF("problemSummary", e.target.value)}
                rows={3} placeholder="무엇이, 어디서, 얼마나 발생했는지 간단히" className="text-sm" />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{alert.problemSummary || "—"}</p>
            )}
          </div>

          {/* 근본 원인 */}
          <div className="border-l-4 border-orange-400 pl-3">
            <p className="text-xs font-bold text-orange-600 mb-1">근본 원인</p>
            {editing ? (
              <Textarea value={form.rootCause} onChange={(e) => setF("rootCause", e.target.value)}
                rows={3} placeholder="왜 이 문제가 발생했는지" className="text-sm" />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{alert.rootCause || "—"}</p>
            )}
          </div>

          {/* 재발방지 조치 */}
          <div className="border-l-4 border-green-400 pl-3">
            <p className="text-xs font-bold text-green-600 mb-1">재발방지 조치</p>
            {editing ? (
              <Textarea value={form.prevention} onChange={(e) => setF("prevention", e.target.value)}
                rows={3} placeholder="현장에서 확인해야 할 포인트, 취해진 조치" className="text-sm" />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{alert.prevention || "—"}</p>
            )}
          </div>
        </div>

        {/* 게시 정보 + 교육 */}
        <div className="grid grid-cols-2 gap-5">
          {/* 게시 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title">게시 정보</h2>
            <div>
              <p className="text-xs text-muted-foreground">대상 공정 / 라인</p>
              {editing ? (
                <Input value={form.targetProcess} onChange={(e) => setF("targetProcess", e.target.value)}
                  placeholder="예: 조립 1라인, 도장공정" className="mt-1 text-sm h-8" />
              ) : (
                <p className="text-sm font-medium mt-1">{alert.targetProcess || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">게시일</p>
              {editing ? (
                <Input type="date" value={form.postedAt} onChange={(e) => setF("postedAt", e.target.value)}
                  className="mt-1 text-sm h-8" />
              ) : (
                <p className="text-sm mt-1">{alert.postedAt ? formatDate(alert.postedAt) : "—"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">만료일</p>
              {editing ? (
                <Input type="date" value={form.expiresAt} onChange={(e) => setF("expiresAt", e.target.value)}
                  className="mt-1 text-sm h-8" />
              ) : (
                <p className="text-sm mt-1">{alert.expiresAt ? formatDate(alert.expiresAt) : "—"}</p>
              )}
            </div>
          </div>

          {/* 교육 이력 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="section-title flex items-center gap-2">
              교육 이력
              {alert.trainedAt && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">완료</span>
              )}
            </h2>
            <div>
              <p className="text-xs text-muted-foreground">교육 완료일</p>
              {editing ? (
                <Input type="date" value={form.trainedAt} onChange={(e) => setF("trainedAt", e.target.value)}
                  className="mt-1 text-sm h-8" />
              ) : (
                <p className="text-sm mt-1">{alert.trainedAt ? formatDate(alert.trainedAt) : "—"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">교육 담당자</p>
              {editing ? (
                <Input value={form.trainedByName} onChange={(e) => setF("trainedByName", e.target.value)}
                  placeholder="담당자명" className="mt-1 text-sm h-8" />
              ) : (
                <p className="text-sm mt-1">{alert.trainedByName || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">교육 비고</p>
              {editing ? (
                <Textarea value={form.trainingNote} onChange={(e) => setF("trainingNote", e.target.value)}
                  rows={2} placeholder="교육 대상 인원, 방식 등" className="mt-1 text-sm" />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{alert.trainingNote || "—"}</p>
              )}
            </div>
          </div>
        </div>

        <AttachmentSection entityType="q_alert" entityId={alert.id} />

        {/* 출처 정보 */}
        {(alert.sourceType || alert.createdByName) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="section-title mb-3">연결 정보</h2>
            <div className="flex gap-6 text-sm">
              {alert.sourceNumber && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">출처</p>
                  {sourceHref ? (
                    <Link href={sourceHref} className="text-primary font-semibold font-mono hover:underline text-sm">
                      {alert.sourceNumber}
                    </Link>
                  ) : (
                    <p className="font-mono font-semibold">{alert.sourceNumber}</p>
                  )}
                </div>
              )}
              {alert.createdByName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">작성자</p>
                  <p>{alert.createdByName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">등록일</p>
                <p>{formatDate(alert.createdAt)}</p>
              </div>
            </div>
          </div>
        )}

        {isOrgAdmin && (
          <AdminRecordPanel
            currentNumber={alert.alertNumber}
            deleteApiUrl={`/api/nc/q-alerts/${alert.id}`}
            renumberApiUrl={`/api/nc/q-alerts/${alert.id}/renumber`}
            listHref="/q-alerts"
            onRenumbered={(newNumber) => setAlert((prev) => ({ ...prev, alertNumber: newNumber }))}
          />
        )}
      </div>
    </div>
  );
}
