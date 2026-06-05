"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

export function ClassifyEmailsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isClassifying, setIsClassifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleClassifyEmails() {
    setIsClassifying(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/ai/classify-emails", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to classify emails.");
      }

      const successMessage = `Classified ${data.classified ?? 0} emails.`;
      setMessage(successMessage);
      setToast({ type: "success", message: successMessage });
      startTransition(() => {
        router.refresh();
      });
    } catch (classifyError) {
      const errorMessage = classifyError instanceof Error ? classifyError.message : "Unable to classify emails.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsClassifying(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClassifyEmails}
        disabled={isClassifying || isPending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isClassifying || isPending ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Bot size={17} aria-hidden="true" />}
        {isClassifying || isPending ? "Classifying..." : "Classify"}
      </button>
      {message ? <p className="text-sm font-medium text-teal-800">{message}</p> : null}
      {error ? <p className="max-w-sm text-sm font-medium text-rose-700">{error}</p> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}
