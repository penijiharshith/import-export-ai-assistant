"use client";

import { useState } from "react";
import { FileSearch, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { HSCodeResult } from "@/lib/ai/suggest-hs-code";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

export function HSCodeSuggestion({ emailId }: { emailId: string }) {
  const [result, setResult] = useState<HSCodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function getHSCode() {
    setIsLoading(true);
    setToast(null);

    try {
      const response = await fetch("/api/ai/hs-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to suggest an HS code.");
      }

      setResult(data.result);
      setToast({ type: "success", message: "HS code suggestion ready." });
    } catch (suggestionError) {
      setToast({
        type: "error",
        message: suggestionError instanceof Error ? suggestionError.message : "Unable to suggest an HS code.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="contents">
      <button
        type="button"
        onClick={getHSCode}
        disabled={isLoading}
        className="inline-flex min-h-20 w-full flex-col items-start justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-150 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <FileSearch size={17} aria-hidden="true" />}
        {isLoading ? "Finding HS code..." : "Get HS Code"}
      </button>

      {result ? <HSCodeCard result={result} /> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}

function HSCodeCard({ result }: { result: HSCodeResult }) {
  const confidenceTone = {
    high: "bg-emerald-50 text-emerald-800",
    medium: "bg-amber-50 text-amber-900",
    low: "bg-rose-50 text-rose-800",
  };

  return (
    <section className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase text-teal-900">
          <Sparkles size={17} aria-hidden="true" />
          HS Code Suggestion
        </div>
        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">Ollama</span>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <Detail label="Product" value={result.product} />
        <Detail label="HS Code" value={result.hs_code} emphasis />
        <Detail label="Chapter" value={result.chapter} />
      </dl>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">Description</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{result.description}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          Common duty range: {result.common_duty_range}
        </span>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${confidenceTone[result.confidence]}`}>
          {result.confidence} confidence
        </span>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">Notes</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
          {result.notes.length ? result.notes.map((note) => (
            <li key={note} className="flex gap-2">
              <span aria-hidden="true">-</span>
              {note}
            </li>
          )) : <li>No additional classification notes.</li>}
        </ul>
      </div>

      <p className="mt-4 flex gap-2 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        <TriangleAlert className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
        Disclaimer: {result.disclaimer}
      </p>
    </section>
  );
}

function Detail({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`mt-1 ${emphasis ? "text-base font-semibold text-teal-800" : "font-medium text-slate-900"}`}>{value}</dd>
    </div>
  );
}
