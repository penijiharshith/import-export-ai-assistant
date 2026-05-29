"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";

export type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

export function ToastNotice({ toast }: { toast: ToastState }) {
  if (!toast) {
    return null;
  }

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-lg border p-4 text-sm shadow-lg ${
        isSuccess
          ? "border-teal-200 bg-teal-50 text-teal-950"
          : "border-rose-200 bg-rose-50 text-rose-950"
      }`}
    >
      {isSuccess ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> : <TriangleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />}
      <p className="leading-6">{toast.message}</p>
    </div>
  );
}
