"use client";

import { useState, useEffect } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface Attachment {
  id: string;
  filename: string;
  mimeType: string | null;
}

function viewUrl(id: string) {
  return `/api/nc/attachments/${id}/view`;
}

export function ComplaintPhotosPanel({ complaintId }: { complaintId: string }) {
  const t = useTranslations("complaint");
  const [images, setImages] = useState<Attachment[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/nc/attachments?entityType=customer_complaint&entityId=${complaintId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: Attachment[]) => setImages(data.filter((a) => a.mimeType?.startsWith("image/"))));
  }, [complaintId]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-gray-500" />
          {t("defectPhotos")} ({images.length})
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50 cursor-pointer group"
              onClick={() => setLightbox(viewUrl(img.id))}
            >
              <img
                src={viewUrl(img.id)}
                alt={img.filename}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-sm"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightbox}
              alt=""
              className="max-w-full max-h-[90vh] mx-auto rounded-xl object-contain"
            />
            {images.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setLightbox(viewUrl(img.id))}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${lightbox === viewUrl(img.id) ? "border-white" : "border-white/30"}`}
                  >
                    <img src={viewUrl(img.id)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
