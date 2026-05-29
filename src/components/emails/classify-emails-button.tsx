"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";

export function ClassifyEmailsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isClassifying, setIsClassifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      setMessage(`Classified ${data.classified ?? 0} emails.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (classifyError) {
      setError(classifyError instanceof Error ? classifyError.message : "Unable to classify emails.");
    } finally {
      setIsClassifying(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleClassifyEmails}
        disabled={isClassifying || isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isClassifying || isPending ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Bot size={17} aria-hidden="true" />}
        {isClassifying || isPending ? "Classifying..." : "Classify emails with AI"}
      </button>
      {message ? <p className="text-sm font-medium text-teal-800">{message}</p> : null}
      {error ? <p className="max-w-sm text-sm font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
