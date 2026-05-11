"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "rounded-xl border shadow-md text-sm",
          error: "bg-red-50 text-red-800 border-red-200",
          success: "bg-green-50 text-green-800 border-green-200",
        },
      }}
    />
  );
}
