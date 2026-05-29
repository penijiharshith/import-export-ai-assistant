"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

export function ArchiveEmailButton({ emailId }: { emailId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isArchiving, setIsArchiving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleArchive() {
    setIsArchiving(true);
    setToast(null);

    try {
      const response = await fetch(`/api/emails/${emailId}/archive`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to remove email from app.");
      }

      setToast({ type: "success", message: "Email removed from this app. Gmail was not affected." });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to remove email from app.",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleArchive}
        disabled={isArchiving || isPending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isArchiving || isPending ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
        Remove
      </button>
      <ToastNotice toast={toast} />
    </>
  );
}
