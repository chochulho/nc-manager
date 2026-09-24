"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Site { id: string; name: string; code: string }

interface PreviewRow {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  preview: { title: string; customerName: string; receivedAt: string };
}

interface PreviewResult {
  total: number;
  okCount: number;
  errorCount: number;
  rows: PreviewRow[];
}

interface CommitResult {
  createdCount: number;
  failedCount: number;
  created: { rowNumber: number; complaintNumber: string }[];
  failed: { rowNumber: number; errors: string[] }[];
}

export function ImportComplaintClient({ sites, defaultSiteId }: { sites: Site[]; defaultSiteId?: string | null }) {
  const router = useRouter();
  const [siteId, setSiteId] = useState(defaultSiteId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);

  function handleFileChange(f: File | null) {
    setFile(f);
    setPreview(null);
    setResult(null);
  }

  async function handlePreview() {
    if (!file) { toast.error("파일을 선택하세요."); return; }
    setPreviewing(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/nc/complaints/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "미리보기에 실패했습니다."); return; }
      setPreview(data);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!file || !preview) return;
    setCommitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (siteId) fd.append("siteId", siteId);
      const res = await fetch("/api/nc/complaints/import/commit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "등록에 실패했습니다."); return; }
      setResult(data);
      toast.success(`${data.createdCount}건 등록 완료`);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/complaints"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">고객 클레임 일괄 등록</h1>
        </div>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* 1. 템플릿 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h2 className="section-title">1. 양식 다운로드</h2>
          <p className="text-sm text-muted-foreground">
            아래 양식을 내려받아 클레임 정보를 채운 뒤 업로드하세요. 고객사명은 마스터에 등록된 이름과 정확히 일치해야 합니다.
          </p>
          <a href="/api/nc/complaints/import/template" download>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> 가져오기 양식 다운로드
            </Button>
          </a>
        </div>

        {/* 2. 업로드 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="section-title">2. 파일 업로드</h2>

          {sites.length > 0 && (
            <div>
              <Label>사업장</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="mt-1 max-w-xs"><SelectValue placeholder="사업장 선택 (선택 사항)" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">업로드하는 모든 클레임에 동일한 사업장이 적용됩니다.</p>
            </div>
          )}

          <div>
            <Label>엑셀 파일 (.xlsx)</Label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <Button onClick={handlePreview} disabled={!file || previewing}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> {previewing ? "확인 중..." : "미리보기"}
          </Button>
        </div>

        {/* 3. 미리보기 결과 */}
        {preview && !result && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">3. 미리보기 결과</h2>
            <div className="flex gap-4 text-sm">
              <span>총 <strong>{preview.total}</strong>건</span>
              <span className="text-green-600">성공 <strong>{preview.okCount}</strong>건</span>
              <span className="text-red-600">오류 <strong>{preview.errorCount}</strong>건</span>
            </div>

            <div className="border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">행</th>
                    <th className="text-left px-3 py-2 font-medium">제목</th>
                    <th className="text-left px-3 py-2 font-medium">고객사</th>
                    <th className="text-left px-3 py-2 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.rows.map((r) => (
                    <tr key={r.rowNumber} className={r.ok ? "" : "bg-red-50"}>
                      <td className="px-3 py-2 text-muted-foreground">{r.rowNumber}</td>
                      <td className="px-3 py-2">{r.preview.title || "—"}</td>
                      <td className="px-3 py-2">{r.preview.customerName || "—"}</td>
                      <td className="px-3 py-2">
                        {r.ok ? (
                          <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> 정상</span>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-red-600">
                            <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{r.errors.join(" / ")}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={handleCommit} disabled={preview.okCount === 0 || committing}>
              <Upload className="h-4 w-4 mr-1" /> {committing ? "등록 중..." : `${preview.okCount}건 등록하기`}
            </Button>
          </div>
        )}

        {/* 4. 등록 결과 */}
        {result && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="section-title">등록 완료</h2>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">등록 <strong>{result.createdCount}</strong>건</span>
              <span className="text-red-600">실패 <strong>{result.failedCount}</strong>건</span>
            </div>
            {result.failed.length > 0 && (
              <div className="text-sm text-red-600 space-y-1">
                {result.failed.map((f) => (
                  <p key={f.rowNumber}>행 {f.rowNumber}: {f.errors.join(" / ")}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => router.push("/complaints")}>클레임 목록으로 이동</Button>
              <Button variant="outline" onClick={() => { setFile(null); setPreview(null); setResult(null); }}>다른 파일 업로드</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
