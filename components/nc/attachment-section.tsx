"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Paperclip, Upload, X, FileText, FileImage, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Attachment {
  id: string;
  filename: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}

function viewUrl(id: string) {
  return `/api/nc/attachments/${id}/view`;
}

interface Props {
  entityType: "internal_nc" | "customer_complaint" | "capa";
  entityId: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isImage(mimeType: string | null): boolean {
  return !!mimeType?.startsWith("image/");
}

export function AttachmentSection({ entityType, entityId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/nc/attachments?entityType=${entityType}&entityId=${entityId}`);
    if (res.ok) setAttachments(await res.json());
  }

  useEffect(() => { load(); }, [entityType, entityId]);

  async function uploadFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    if (!fileArr.length) return;

    setUploading(true);
    let successCount = 0;

    for (const file of fileArr) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("entityType", entityType);
      fd.append("entityId", entityId);

      const res = await fetch("/api/nc/attachments", { method: "POST", body: fd });
      if (res.ok) {
        successCount++;
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(`${file.name}: ${err.error ?? "업로드 실패"}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount}개 파일 업로드 완료`);
      load();
    }
    setUploading(false);
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`"${filename}"을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/nc/attachments/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("삭제됐습니다.");
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  }, [entityType, entityId]);

  const images = attachments.filter((a) => isImage(a.mimeType));
  const files = attachments.filter((a) => !isImage(a.mimeType));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          첨부파일 ({attachments.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          {uploading ? "업로드 중..." : "파일 추가"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {/* 드래그 앤 드롭 존 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors text-sm ${
          dragging ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <Upload className="h-5 w-5 mx-auto mb-1.5 text-gray-400" />
        <p className="text-muted-foreground">
          파일을 끌어다 놓거나 클릭해서 선택
          <span className="block text-xs mt-0.5">이미지, PDF, Excel 등 최대 20MB</span>
        </p>
      </div>

      {/* 이미지 그리드 */}
      {images.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">이미지</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                <img
                  src={viewUrl(img.id)}
                  alt={img.filename}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(viewUrl(img.id))}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-1.5">
                  <span className="text-white text-xs truncate max-w-[70%]">{img.filename}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(img.id, img.filename); }}
                    className="p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">파일</p>
          <div className="space-y-1.5">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.filename}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={viewUrl(file.id)} download={file.filename} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(file.id, file.filename)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-2">첨부된 파일이 없습니다.</p>
      )}

      {/* 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-1 text-sm"
            >
              <X className="h-5 w-5" /> 닫기
            </button>
            <img
              src={lightbox}
              alt=""
              className="max-w-full max-h-[90vh] mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
