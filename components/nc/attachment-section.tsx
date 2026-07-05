"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Paperclip, Upload, X, FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { upload } from "@vercel/blob/client";

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
  entityType: "internal_nc" | "customer_complaint" | "capa" | "q_alert";
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
  const tc = useTranslations("common");
  const ta = useTranslations("attachments");

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
      try {
        const ext = file.name.split(".").pop() ?? "";
        const safeName = `nc/${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const blob = await upload(safeName, file, {
          access: "public",
          handleUploadUrl: "/api/nc/attachments/client-token",
        });

        const res = await fetch("/api/nc/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType,
            entityId,
            filename: file.name,
            storageKey: blob.url,
            mimeType: file.type || blob.contentType,
            sizeBytes: file.size,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(`${file.name}: ${err.error ?? ta("uploadFailed")}`);
        }
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : ta("uploadFailed")}`);
      }
    }

    if (successCount > 0) {
      toast.success(ta("uploadSuccess", { count: successCount }));
      load();
    }
    setUploading(false);
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(ta("deleteConfirm", { filename }))) return;
    const res = await fetch(`/api/nc/attachments/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(tc("success"));
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  }, [entityType, entityId]);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const images: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] || "png";
            images.push(new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type }));
          }
        }
      }
      if (images.length > 0) {
        e.preventDefault();
        uploadFiles(images);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [entityType, entityId]);

  const images = attachments.filter((a) => isImage(a.mimeType));
  const files = attachments.filter((a) => !isImage(a.mimeType));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          {ta("title")} ({attachments.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          {uploading ? tc("adding") : ta("addFile")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {/* Drag & drop zone */}
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
          {tc("dropzoneHint")}
          <span className="block text-xs mt-0.5">{ta("dropzoneDetail")}</span>
          <span className="block text-xs mt-0.5">{tc("pasteHint")}</span>
        </p>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{ta("images")}</p>
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

      {/* File list */}
      {files.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{ta("files")}</p>
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
        <p className="text-center text-xs text-muted-foreground py-2">{ta("empty")}</p>
      )}

      {/* Lightbox */}
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
              <X className="h-5 w-5" /> {tc("close")}
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
