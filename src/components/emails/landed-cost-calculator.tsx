"use client";

import { useState } from "react";
import { Calculator, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { LandedCostResult } from "@/lib/ai/calculate-landed-cost";
import { ToastNotice, type ToastState } from "@/components/toast-notice";
import { getUserFacingApiError, readJsonResponse } from "@/lib/api-response";

export function LandedCostCalculator({ emailId }: { emailId: string }) {
  const [result, setResult] = useState<LandedCostResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function calculate() {
    setIsLoading(true);
    setToast(null);

    try {
      const response = await fetch("/api/ai/landed-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      const data = await readJsonResponse(response) as { result?: LandedCostResult } | null;

      if (!response.ok) {
        throw new Error(getUserFacingApiError(data, "Unable to calculate landed cost."));
      }

      if (!data?.result) {
        throw new Error("Unable to calculate landed cost.");
      }

      setResult(data.result);
      setToast({ type: "success", message: "Landed cost breakdown ready." });
    } catch (calculationError) {
      setToast({
        type: "error",
        message: calculationError instanceof Error ? calculationError.message : "Unable to calculate landed cost.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="contents">
      <button
        type="button"
        onClick={calculate}
        disabled={isLoading}
        className="inline-flex min-h-20 w-full flex-col items-start justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-150 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Calculator size={17} aria-hidden="true" />}
        {isLoading ? "Calculating..." : "Calculate Landed Cost"}
      </button>

      {result ? <LandedCostCard result={result} /> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}

function LandedCostCard({ result }: { result: LandedCostResult }) {
  const rows = [
    [`Unit Price (${result.incoterm})`, unitAmount(result.unit_price_per_pc, result.currency)],
    ["Freight", unitAmount(result.freight_per_pc, result.currency)],
    ["Insurance", unitAmount(result.insurance_per_pc, result.currency)],
    [`Import Duty (${result.import_duty_percent})`, unitAmount(result.import_duty_per_pc, result.currency)],
    ["Customs Handling", unitAmount(result.customs_handling_per_pc, result.currency)],
    ["Local Transport", unitAmount(result.local_transport_per_pc, result.currency)],
  ];

  return (
    <section className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase text-teal-900">
          <Sparkles size={17} aria-hidden="true" />
          Landed Cost Breakdown
        </div>
        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">Groq</span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">
        <span className="font-semibold text-slate-900">{result.product}</span>
        <span className="text-slate-400"> | </span>
        Qty: {result.quantity}
        <span className="text-slate-400"> | </span>
        {result.incoterm}
      </p>

      <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-3 py-2.5">
            <dt className="text-slate-600">{label}</dt>
            <dd className="text-right font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-4 space-y-2 rounded-md border border-teal-300 bg-teal-50 p-3">
        <CostTotal label="Landed Cost Per Unit" value={unitAmount(result.landed_cost_per_pc, result.currency)} />
        <CostTotal label="Total Order Cost" value={orderAmount(result.total_order_landed_cost, result.currency)} />
      </dl>

      <div className="mt-4 text-sm">
        <p className="font-semibold text-slate-900">Incoterm Note</p>
        <p className="mt-1 leading-6 text-slate-600">{result.incoterm_note}</p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">Assumptions</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
          {result.assumptions.length ? result.assumptions.map((assumption) => (
            <li key={assumption} className="flex gap-2">
              <span aria-hidden="true">-</span>
              {assumption}
            </li>
          )) : <li>No additional assumptions provided.</li>}
        </ul>
      </div>

      <p className="mt-4 flex gap-2 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        <TriangleAlert className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
        Disclaimer: {result.disclaimer}
      </p>
    </section>
  );
}

function unitAmount(value: string, currency: string) {
  return /included|unavailable/i.test(value) ? value : `${currency} ${value} / pc`;
}

function orderAmount(value: string, currency: string) {
  return /included|unavailable/i.test(value) ? value : `${currency} ${value}`;
}

function CostTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <dt className="text-xs font-semibold uppercase text-teal-700">{label}</dt>
      <dd className="text-right text-sm font-semibold text-teal-950">{value}</dd>
    </div>
  );
}
