"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, WandSparkles } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

export function GenerateDraftsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleGenerateDrafts() {
    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-drafts", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(data.errors)
          ? data.errors.map((item: { message?: string }) => item.message).filter(Boolean).join(" ")
          : null;

        throw new Error(errorMessage || data.message || data.error || "Unable to generate drafts.");
      }

      const successMessage = `Processed ${data.processed ?? 0} emails. Inserted ${data.inserted ?? 0} drafts. Skipped ${data.skipped ?? 0}.`;
      setMessage(successMessage);
      setToast({ type: "success", message: successMessage });

      if (Array.isArray(data.errors) && data.errors.length) {
        const errorMessage = data.errors.map((item: { message?: string }) => item.message).filter(Boolean).join(" ");
        setError(errorMessage);
        setToast({ type: "error", message: errorMessage });
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (generateError) {
      const errorMessage = generateError instanceof Error ? generateError.message : "Unable to generate drafts.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleGenerateDrafts}
        disabled={isGenerating || isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating || isPending ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <WandSparkles size={17} aria-hidden="true" />}
        {isGenerating || isPending ? "Generating..." : "Generate AI drafts"}
      </button>
      {message ? <p className="text-sm font-medium text-teal-800">{message}</p> : null}
      {error ? <p className="max-w-sm text-sm font-medium text-rose-700">{error}</p> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}
