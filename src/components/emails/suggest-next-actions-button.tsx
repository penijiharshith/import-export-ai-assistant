"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Loader2 } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";
import { getUserFacingApiError, readJsonResponse } from "@/lib/api-response";

export function SuggestNextActionsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleSuggestActions() {
    setIsSuggesting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/ai/suggest-actions", {
        method: "POST",
      });
      const data = await readJsonResponse(response) as { inserted?: number } | null;

      if (!response.ok) {
        throw new Error(getUserFacingApiError(data, "Unable to suggest next actions."));
      }

      const successMessage = `Generated ${data?.inserted ?? 0} action suggestions.`;
      setMessage(successMessage);
      setToast({ type: "success", message: successMessage });
      startTransition(() => {
        router.refresh();
      });
    } catch (suggestError) {
      const errorMessage = suggestError instanceof Error ? suggestError.message : "Unable to suggest next actions.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSuggestActions}
        disabled={isSuggesting || isPending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-sm font-medium text-teal-700 transition-all duration-150 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSuggesting || isPending ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Lightbulb size={17} aria-hidden="true" />}
        {isSuggesting || isPending ? "Suggesting..." : "Suggest"}
      </button>
      {message ? <p className="text-sm font-medium text-teal-800">{message}</p> : null}
      {error ? <p className="max-w-sm text-sm font-medium text-rose-700">{error}</p> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}
