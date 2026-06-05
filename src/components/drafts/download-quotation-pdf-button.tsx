"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { generateQuotationPDF } from "@/lib/generate-quotation-pdf";

interface Props {
  draft: {
    id: string;
    subject: string;
    body: string;
    created_at: string;
  };
  extracted: {
    product?: string | null;
    quantity?: string | null;
    price?: string | null;
    incoterm?: string | null;
    delivery_date?: string | null;
    payment_terms?: string | null;
    destination_country?: string | null;
  } | null;
  senderEmail: string;
  userEmail: string;
}

export function DownloadQuotationPDFButton({ draft, extracted, senderEmail, userEmail }: Props) {
  const [loading, setLoading] = useState(false);

  function handleDownload() {
    setLoading(true);

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(today.getDate() + 7);

      generateQuotationPDF({
        quotation_number: `QT-${draft.id.slice(0, 8).toUpperCase()}`,
        date: today.toLocaleDateString("en-GB"),
        valid_until: validUntil.toLocaleDateString("en-GB"),
        from_company: "Your Company Name",
        from_email: userEmail,
        to_company: "Buyer",
        to_email: senderEmail,
        product: extracted?.product ?? "N/A",
        quantity: extracted?.quantity ?? "N/A",
        unit_price: extracted?.price ?? "As per quotation",
        incoterm: extracted?.incoterm ?? "N/A",
        lead_time: extracted?.delivery_date ?? "To be confirmed",
        payment_terms: extracted?.payment_terms ?? "To be confirmed",
        destination: extracted?.destination_country ?? "N/A",
        notes: "Pricing is indicative and subject to final confirmation based on artwork and specifications.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <FileDown size={17} aria-hidden="true" />}
      {loading ? "Generating..." : "Download Quotation PDF"}
    </button>
  );
}
