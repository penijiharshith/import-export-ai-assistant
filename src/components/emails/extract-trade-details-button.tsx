"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Loader2 } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

export function ExtractTradeDetailsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExtracting, setIsExtracting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleExtractTradeDetails() {
    setIsExtracting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/ai/extract-trade-details", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to extract trade details.");
      }

      const successMessage = `Extracted details for ${data.extracted ?? 0} emails.`;
      setMessage(successMessage);
      setToast({ type: "success", message: successMessage });
      startTransition(() => {
        router.refresh();
      });
    } catch (extractError) {
      const errorMessage = extractError instanceof Error ? extractError.message : "Unable to extract trade details.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleExtractTradeDetails}
        disabled={isExtracting || isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExtracting || isPending ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <FileSearch size={17} aria-hidden="true" />}
        {isExtracting || isPending ? "Extracting..." : "Extract trade details"}
      </button>
      {message ? <p className="text-sm font-medium text-teal-800">{message}</p> : null}
      {error ? <p className="max-w-sm text-sm font-medium text-rose-700">{error}</p> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}
