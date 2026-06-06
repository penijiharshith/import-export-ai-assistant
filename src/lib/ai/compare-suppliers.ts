import { chat } from "@/lib/ai/groq";

export type SupplierQuote = {
  id: string;
  supplier_name: string | null;
  product: string | null;
  unit_price: number | null;
  currency: string | null;
  quantity: number | null;
  moq: number | null;
  incoterm: string | null;
  lead_time: string | null;
  payment_terms: string | null;
  destination_country: string | null;
  risk_notes: string | null;
};

export type SupplierComparisonNote = {
  supplier_name: string;
  strengths: string[];
  risks: string[];
  negotiation_suggestions: string[];
};

export type ComparisonResult = {
  summary: string;
  cheapest_supplier: string;
  fastest_supplier: string;
  safest_supplier: string;
  best_overall: string;
  per_supplier_notes: SupplierComparisonNote[];
  overall_negotiation_tips: string[];
};

function cleanString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1200) : fallback;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 300))
    .slice(0, 10);
}

function normalizeComparison(value: unknown): ComparisonResult {
  const candidate = value && typeof value === "object" ? value as Partial<ComparisonResult> : {};
  const supplierNotes = Array.isArray(candidate.per_supplier_notes) ? candidate.per_supplier_notes : [];

  return {
    summary: cleanString(candidate.summary, "Review the selected supplier quotes before making a purchasing decision."),
    cheapest_supplier: cleanString(candidate.cheapest_supplier, "Not enough data"),
    fastest_supplier: cleanString(candidate.fastest_supplier, "Not enough data"),
    safest_supplier: cleanString(candidate.safest_supplier, "Not enough data"),
    best_overall: cleanString(candidate.best_overall, "Not enough data"),
    per_supplier_notes: supplierNotes.map((note) => {
      const item = note && typeof note === "object" ? note as Partial<SupplierComparisonNote> : {};

      return {
        supplier_name: cleanString(item.supplier_name, "Unnamed supplier"),
        strengths: cleanStringArray(item.strengths),
        risks: cleanStringArray(item.risks),
        negotiation_suggestions: cleanStringArray(item.negotiation_suggestions),
      };
    }),
    overall_negotiation_tips: cleanStringArray(candidate.overall_negotiation_tips),
  };
}

export async function compareSupplierQuotes(quotes: SupplierQuote[]): Promise<ComparisonResult> {
  const content = await chat(
    [
      {
        role: "system",
        content: [
          "You are an expert import-export trade analyst.",
          "Compare supplier quotes and give structured buying recommendations.",
          "Respond ONLY with valid JSON. No explanation outside JSON.",
          "All pricing is indicative. No legally binding statements.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "Compare these supplier quotes and return ONLY this JSON structure:",
          JSON.stringify({
            summary: "...",
            cheapest_supplier: "...",
            fastest_supplier: "...",
            safest_supplier: "...",
            best_overall: "...",
            per_supplier_notes: [
              {
                supplier_name: "...",
                strengths: [],
                risks: [],
                negotiation_suggestions: [],
              },
            ],
            overall_negotiation_tips: [],
          }, null, 2),
          "",
          "Quotes:",
          JSON.stringify(quotes, null, 2),
        ].join("\n"),
      },
    ],
    { temperature: 0.15, json: true }
  );

  try {
    return normalizeComparison(JSON.parse(content));
  } catch {
    throw new Error("Groq supplier comparison returned invalid JSON.");
  }
}
