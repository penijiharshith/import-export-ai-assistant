import { chat } from "@/lib/ai/groq";

export interface LandedCostResult {
  product: string;
  quantity: string;
  incoterm: string;
  origin: string;
  destination: string;
  currency: string;

  unit_price_per_pc: string;
  freight_per_pc: string;
  insurance_per_pc: string;
  import_duty_percent: string;
  import_duty_per_pc: string;
  customs_handling_per_pc: string;
  local_transport_per_pc: string;

  landed_cost_per_pc: string;
  total_order_landed_cost: string;

  incoterm_note: string;
  assumptions: string[];
  disclaimer: string;
}

type LandedCostDetails = {
  product: string;
  quantity: string;
  unit_price: string;
  incoterm: string;
  origin_country: string;
  destination_country: string;
  currency: string;
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
    .map((item) => item.trim().slice(0, 320))
    .slice(0, 8);
}

function normalizeResult(value: unknown, details: LandedCostDetails): LandedCostResult {
  const candidate = value && typeof value === "object" ? value as Partial<LandedCostResult> : {};

  return {
    product: cleanString(candidate.product, details.product),
    quantity: cleanString(candidate.quantity, details.quantity),
    incoterm: cleanString(candidate.incoterm, details.incoterm),
    origin: cleanString(candidate.origin, details.origin_country),
    destination: cleanString(candidate.destination, details.destination_country),
    currency: cleanString(candidate.currency, details.currency),
    unit_price_per_pc: cleanString(candidate.unit_price_per_pc, details.unit_price),
    freight_per_pc: cleanString(candidate.freight_per_pc, "Estimate unavailable"),
    insurance_per_pc: cleanString(candidate.insurance_per_pc, "Estimate unavailable"),
    import_duty_percent: cleanString(candidate.import_duty_percent, "Estimate unavailable"),
    import_duty_per_pc: cleanString(candidate.import_duty_per_pc, "Estimate unavailable"),
    customs_handling_per_pc: cleanString(candidate.customs_handling_per_pc, "Estimate unavailable"),
    local_transport_per_pc: cleanString(candidate.local_transport_per_pc, "Estimate unavailable"),
    landed_cost_per_pc: cleanString(candidate.landed_cost_per_pc, "Estimate unavailable"),
    total_order_landed_cost: cleanString(candidate.total_order_landed_cost, "Estimate unavailable"),
    incoterm_note: cleanString(candidate.incoterm_note, "Confirm included costs with your freight forwarder."),
    assumptions: cleanStringArray(candidate.assumptions),
    disclaimer: cleanString(
      candidate.disclaimer,
      "All costs are indicative estimates only. Verify with your freight forwarder and customs broker before committing to any trade transaction."
    ),
  };
}

export async function calculateLandedCost(details: LandedCostDetails): Promise<LandedCostResult> {
  const content = await chat(
    [
      {
        role: "system",
        content: [
          "You are a senior international trade finance expert specializing in landed cost calculation for import-export businesses.",
          "",
          "LANDED COST RULES - follow strictly:",
          "",
          "INCOTERM ADJUSTMENTS:",
          "- EXW: add freight + insurance + duty + customs handling + local transport",
          "- FOB: add freight + insurance + duty + customs handling + local transport",
          "- CFR/CNF: add insurance + duty + customs handling + local transport",
          "- CIF: add only duty + customs handling + local transport (freight + insurance already included)",
          "- DDP: landed cost = unit price only (all costs included by seller)",
          "",
          "ESTIMATION GUIDELINES:",
          "- Freight: estimate based on origin country, destination, product type, and quantity",
          "- Insurance: typically 0.3% - 0.5% of CIF value",
          "- Import duty: estimate based on product type and destination country (use realistic rates)",
          "- Customs handling: estimate USD 0.05 - 0.15 per unit depending on shipment size",
          "- Local transport: estimate based on destination city and quantity",
          "",
          "Always show per-unit breakdown AND total order cost.",
          "All values in the same currency as the unit price.",
          "All numbers must be actual figures, not placeholders.",
          "For costs already included by the Incoterm, return \"Included\" rather than a numeric value.",
          "Respond ONLY with valid JSON. No explanation outside JSON.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "Calculate the full landed cost for this trade shipment:",
          "",
          `Product: ${details.product}`,
          `Quantity: ${details.quantity}`,
          `Unit price: ${details.unit_price}`,
          `Incoterm: ${details.incoterm}`,
          `Origin: ${details.origin_country}`,
          `Destination: ${details.destination_country}`,
          `Currency: ${details.currency}`,
          "",
          "Return ONLY this JSON:",
          JSON.stringify({
            product: "...",
            quantity: "...",
            incoterm: "...",
            origin: "...",
            destination: "...",
            currency: "USD",
            unit_price_per_pc: "X.XX",
            freight_per_pc: "X.XX",
            insurance_per_pc: "X.XX",
            import_duty_percent: "X%",
            import_duty_per_pc: "X.XX",
            customs_handling_per_pc: "X.XX",
            local_transport_per_pc: "X.XX",
            landed_cost_per_pc: "X.XX",
            total_order_landed_cost: "XX,XXX.XX",
            incoterm_note: "Brief note on what is included/excluded based on incoterm",
            assumptions: ["assumption 1", "assumption 2"],
            disclaimer: "All costs are indicative estimates only. Verify with your freight forwarder and customs broker before committing to any trade transaction.",
          }, null, 2),
        ].join("\n"),
      },
    ],
    { temperature: 0.15, json: true }
  );

  try {
    return normalizeResult(JSON.parse(content), details);
  } catch {
    console.error("Unable to parse Groq landed cost response:", content);
    throw new Error("Groq landed cost calculation returned invalid JSON.");
  }
}
