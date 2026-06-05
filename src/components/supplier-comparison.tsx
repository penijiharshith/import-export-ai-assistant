"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart2, ExternalLink, Loader2, Scale, Trash2 } from "lucide-react";
import type { ComparisonResult } from "@/lib/ai/compare-suppliers";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

type SupplierQuoteRow = {
  id: string;
  email_id: string | null;
  supplier_name: string | null;
  product: string | null;
  unit_price: number | null;
  currency: string | null;
  quantity: number | null;
  moq: number | null;
  incoterm: string | null;
  lead_time: string | null;
  payment_terms: string | null;
  risk_notes: string | null;
  email_messages?: {
    subject?: string | null;
    sender?: string | null;
  } | Array<{
    subject?: string | null;
    sender?: string | null;
  }> | null;
};

function joinedEmail(quote: SupplierQuoteRow) {
  return Array.isArray(quote.email_messages) ? quote.email_messages[0] : quote.email_messages;
}

function text(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
}

function formatPrice(quote: SupplierQuoteRow) {
  return quote.unit_price === null
    ? "Not provided"
    : `${quote.currency ?? "USD"} ${Number(quote.unit_price).toLocaleString("en", { maximumFractionDigits: 4 })}`;
}

const comparisonBadges: Array<{ label: string; key: keyof Pick<ComparisonResult, "cheapest_supplier" | "fastest_supplier" | "safest_supplier" | "best_overall"> }> = [
  { label: "Cheapest", key: "cheapest_supplier" },
  { label: "Fastest", key: "fastest_supplier" },
  { label: "Safest", key: "safest_supplier" },
  { label: "Best Overall", key: "best_overall" },
];

export function SupplierComparison() {
  const [quotes, setQuotes] = useState<SupplierQuoteRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/supplier-quotes", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? data.error ?? "Unable to load supplier quotes.");
        }

        return data;
      })
      .then((data) => {
        if (isMounted) {
          setQuotes(data.quotes ?? []);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier quotes.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function toggleQuote(quoteId: string) {
    setSelectedIds((current) => current.includes(quoteId)
      ? current.filter((id) => id !== quoteId)
      : [...current, quoteId]);
  }

  async function deleteQuote(quoteId: string) {
    setDeletingId(quoteId);
    setToast(null);

    try {
      const response = await fetch(`/api/supplier-quotes/${quoteId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to delete supplier quote.");
      }

      setQuotes((current) => current.filter((quote) => quote.id !== quoteId));
      setSelectedIds((current) => current.filter((id) => id !== quoteId));
      setComparison(null);
      setToast({ type: "success", message: "Supplier quote removed." });
    } catch (deleteError) {
      setToast({
        type: "error",
        message: deleteError instanceof Error ? deleteError.message : "Unable to delete supplier quote.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function compareQuotes() {
    setIsComparing(true);
    setToast(null);

    try {
      const response = await fetch("/api/ai/compare-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteIds: selectedIds }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to compare supplier quotes.");
      }

      setComparison(data.comparison);
      setToast({ type: "success", message: "Supplier comparison ready." });
    } catch (compareError) {
      setToast({
        type: "error",
        message: compareError instanceof Error ? compareError.message : "Unable to compare supplier quotes.",
      });
    } finally {
      setIsComparing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex animate-pulse items-center gap-2 rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading supplier quotes
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>;
  }

  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <BarChart2 className="mx-auto size-8 text-slate-300" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">No supplier quotes saved yet</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Emails classified as supplier quotes will appear here after extraction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Extracted supplier offers</h2>
            <p className="mt-1 text-sm text-slate-500">Select at least two suppliers for an AI comparison.</p>
          </div>
          <button
            type="button"
            onClick={compareQuotes}
            disabled={selectedIds.length < 2 || isComparing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isComparing ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Scale size={17} aria-hidden="true" />}
            {isComparing ? "Comparing..." : "Compare with AI"}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-[1280px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Select</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Unit Price</th>
                <th className="px-4 py-3 font-semibold">Quantity / MOQ</th>
                <th className="px-4 py-3 font-semibold">Incoterm</th>
                <th className="px-4 py-3 font-semibold">Lead Time</th>
                <th className="px-4 py-3 font-semibold">Payment Terms</th>
                <th className="px-4 py-3 font-semibold">Risk Notes</th>
                <th className="px-4 py-3 font-semibold">Source Email</th>
                <th className="px-4 py-3 font-semibold">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotes.map((quote) => {
                const email = joinedEmail(quote);

                return (
                  <tr key={quote.id} className={`align-top text-slate-600 transition-all duration-150 ${selectedIds.includes(quote.id) ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(quote.id)}
                        onChange={() => toggleQuote(quote.id)}
                        aria-label={`Select ${quote.supplier_name ?? "supplier"} quote`}
                        className="size-4 accent-teal-700"
                      />
                    </td>
                    <td className="max-w-52 px-4 py-4 font-semibold text-slate-900">{text(quote.supplier_name ?? email?.sender)}</td>
                    <td className="max-w-52 px-4 py-4">{text(quote.product)}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-teal-800">{formatPrice(quote)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{text(quote.quantity)} / {text(quote.moq)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{text(quote.incoterm)}</td>
                    <td className="max-w-44 px-4 py-4">{text(quote.lead_time)}</td>
                    <td className="max-w-52 px-4 py-4">{text(quote.payment_terms)}</td>
                    <td className="max-w-64 px-4 py-4 text-slate-600">{text(quote.risk_notes)}</td>
                    <td className="max-w-56 px-4 py-4">
                      {quote.email_id ? (
                        <Link href={`/emails/${quote.email_id}`} className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900">
                          {email?.subject ?? "Open email"}
                          <ExternalLink size={14} aria-hidden="true" />
                        </Link>
                      ) : (
                        "Not available"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => deleteQuote(quote.id)}
                        disabled={deletingId === quote.id}
                        className="grid size-9 place-items-center rounded-lg text-slate-400 transition-all duration-150 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Delete ${quote.supplier_name ?? "supplier"} quote`}
                        title="Delete quote"
                      >
                        {deletingId === quote.id ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {comparison ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Ollama analysis</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Supplier comparison</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{comparison.summary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {comparisonBadges.map((badge) => (
              <div key={badge.key} className="rounded-xl border border-teal-100 bg-teal-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-teal-700">{badge.label}</p>
                <p className="mt-2 font-semibold text-teal-950">{comparison[badge.key]}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {comparison.per_supplier_notes.map((supplier) => (
              <article key={supplier.supplier_name} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">{supplier.supplier_name}</h3>
                <ComparisonList label="Strengths" items={supplier.strengths} tone="teal" />
                <ComparisonList label="Risks" items={supplier.risks} tone="rose" />
                <ComparisonList label="Negotiation suggestions" items={supplier.negotiation_suggestions} tone="amber" />
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Overall negotiation tips</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {comparison.overall_negotiation_tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span aria-hidden="true">-</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <ToastNotice toast={toast} />
    </div>
  );
}

function ComparisonList({ label, items, tone }: { label: string; items: string[]; tone: "teal" | "rose" | "amber" }) {
  const toneClass = {
    teal: "text-teal-800",
    rose: "text-rose-800",
    amber: "text-amber-900",
  }[tone];

  return (
    <div className="mt-4">
      <p className={`text-xs font-semibold uppercase ${toneClass}`}>{label}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
        {items.length ? items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">-</span>
            {item}
          </li>
        )) : <li>None noted.</li>}
      </ul>
    </div>
  );
}
