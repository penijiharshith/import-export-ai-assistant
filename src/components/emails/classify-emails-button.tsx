"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";
import { getUserFacingApiError, readJsonResponse } from "@/lib/api-response";

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
      const data = await readJsonResponse(response) as {
        classified?: number;
        tradeEmails?: number;
        otherEmails?: number;
        failed?: number;
        fallbackCount?: number;
        partial?: boolean;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(getUserFacingApiError(data, "Unable to classify emails. Please try again later."));
      }

      const classified = data?.classified ?? 0;
      const tradeEmails = data?.tradeEmails ?? 0;
      const otherEmails = data?.otherEmails ?? 0;
      const fallbackCount = data?.fallbackCount ?? 0;
      const failed = data?.failed ?? 0;
      const successMessage = data?.partial && data.message ? data.message : [
        `Classified ${classified} emails: ${tradeEmails} trade emails and ${otherEmails} other emails.`,
        fallbackCount > 0 ? `${fallbackCount} used safe fallback.` : null,
        failed > 0 ? `${failed} could not be saved.` : null,
      ].filter(Boolean).join(" ");
      setMessage(successMessage);
      setToast({ type: "success", message: successMessage });
      startTransition(() => {
        router.refresh();
      });
    } catch (classifyError) {
      const errorMessage = classifyError instanceof Error ? classifyError.message : "Unable to classify emails. Please try again later.";
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
