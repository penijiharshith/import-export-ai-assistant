"use client";

import { useState } from "react";
import { BarChart3, Loader2, Sparkles } from "lucide-react";
import type { MarketPriceEstimate } from "@/lib/ai/estimate-market-price";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

export function MarketPriceEstimate({ emailId }: { emailId: string }) {
  const [estimate, setEstimate] = useState<MarketPriceEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function getEstimate() {
    setIsEstimating(true);
    setToast(null);

    try {
      const response = await fetch("/api/ai/market-price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to estimate market pricing.");
      }

      setEstimate(data.estimate);
      setToast({ type: "success", message: "Competitive pricing estimate ready." });
    } catch (estimateError) {
      setToast({
        type: "error",
        message: estimateError instanceof Error ? estimateError.message : "Unable to estimate market pricing.",
      });
    } finally {
      setIsEstimating(false);
    }
  }

  return (
    <div className="contents">
      <button
        type="button"
        onClick={getEstimate}
        disabled={isEstimating}
        className="inline-flex min-h-20 w-full flex-col items-start justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-3 text-left text-sm font-semibold text-teal-800 transition-all duration-150 hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isEstimating ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <BarChart3 size={17} aria-hidden="true" />}
        {isEstimating ? "Estimating..." : "Get Market Price Estimate"}
      </button>

      {estimate ? <EstimateCard estimate={estimate} /> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}

function EstimateCard({ estimate }: { estimate: MarketPriceEstimate }) {
  const priceBands = [
    { label: "Budget", value: estimate.budget_price, note: "Low-end competitors", tone: "border-slate-200 bg-slate-50" },
    { label: "Mid-Market", value: estimate.mid_market_price, note: "Typical market", tone: "border-teal-200 bg-teal-50" },
    { label: "Premium", value: estimate.premium_price, note: "Premium suppliers", tone: "border-amber-200 bg-amber-50" },
  ];

  return (
    <section className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase text-teal-900">
          <Sparkles size={17} aria-hidden="true" />
          Competitive Pricing Estimate
        </div>
        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">Groq</span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <Detail label="Product" value={estimate.product} />
        <Detail label="Quantity" value={estimate.quantity} />
        <Detail label="Incoterm" value={estimate.incoterm} />
      </dl>

      <div className="mt-4 grid gap-2">
        {priceBands.map((band) => (
          <div key={band.label} className={`rounded-md border p-3 ${band.tone}`}>
            <p className="text-xs font-semibold uppercase text-slate-600">{band.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{band.value}</p>
            <p className="mt-1 text-xs text-slate-500">{band.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-teal-300 bg-teal-50 p-3">
        <p className="text-xs font-semibold uppercase text-teal-700">Recommended Quote Price</p>
        <p className="mt-1 text-base font-semibold text-teal-950">{estimate.recommended_quote_price}</p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">Competitor Behavior</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{estimate.competitor_behavior}</p>
      </div>

      <EstimateList label="Key Pricing Factors" items={estimate.key_pricing_factors} />
      <EstimateList label="Margin Protection Tips" items={estimate.margin_protection_tips} />

      <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        Note: {estimate.confidence_note}
      </p>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function EstimateList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
        {items.length ? items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">-</span>
            {item}
          </li>
        )) : <li>No additional notes.</li>}
      </ul>
    </div>
  );
}
