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
        className="grid size-8 place-items-center rounded-lg text-slate-400 transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Remove email from this app"
        title="Remove email from this app"
      >
        {isArchiving || isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
      </button>
      <ToastNotice toast={toast} />
    </>
  );
}
