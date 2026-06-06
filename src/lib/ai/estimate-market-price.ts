import { chat } from "@/lib/ai/groq";

export interface MarketPriceEstimate {
  product: string;
  quantity: string;
  incoterm: string;
  budget_price: string;
  mid_market_price: string;
  premium_price: string;
  recommended_quote_price: string;
  competitor_behavior: string;
  margin_protection_tips: string[];
  key_pricing_factors: string[];
  confidence_note: string;
}

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

function normalizeEstimate(value: unknown): MarketPriceEstimate {
  const candidate = value && typeof value === "object" ? value as Partial<MarketPriceEstimate> : {};

  return {
    product: cleanString(candidate.product, "Product not specified"),
    quantity: cleanString(candidate.quantity, "Quantity not specified"),
    incoterm: cleanString(candidate.incoterm, "Incoterm not specified"),
    budget_price: cleanString(candidate.budget_price, "Estimate unavailable"),
    mid_market_price: cleanString(candidate.mid_market_price, "Estimate unavailable"),
    premium_price: cleanString(candidate.premium_price, "Estimate unavailable"),
    recommended_quote_price: cleanString(candidate.recommended_quote_price, "Estimate unavailable"),
    competitor_behavior: cleanString(candidate.competitor_behavior, "Competitor pricing behavior depends on final specifications and shipment terms."),
    margin_protection_tips: cleanStringArray(candidate.margin_protection_tips),
    key_pricing_factors: cleanStringArray(candidate.key_pricing_factors),
    confidence_note: cleanString(candidate.confidence_note, "Indicative estimate only. Confirm specifications, costs, and freight before quoting."),
  };
}

export async function estimateMarketPrice(
  tradeDetails: Record<string, string>
): Promise<MarketPriceEstimate> {
  const content = await chat(
    [
      {
        role: "system",
        content: [
          "You are a senior import-export pricing analyst with deep knowledge of global trade.",
          "A seller needs to know competitive market pricing before quoting a buyer.",
          "Estimate realistic market prices based on product type, quantity, incoterm, and destination.",
          "Be specific with price ranges - give actual USD numbers, not vague ranges.",
          "Always note that prices are indicative estimates only.",
          "Respond ONLY with valid JSON. No explanation outside JSON.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "A seller received this buyer inquiry. Estimate competitive market pricing so the seller can quote competitively.",
          "",
          "Trade details:",
          JSON.stringify(tradeDetails, null, 2),
          "",
          "Return ONLY this JSON:",
          JSON.stringify({
            product: "...",
            quantity: "...",
            incoterm: "...",
            budget_price: "USD X.XX per pc (low-end competitors)",
            mid_market_price: "USD X.XX per pc (typical market)",
            premium_price: "USD X.XX per pc (premium suppliers)",
            recommended_quote_price: "USD X.XX per pc",
            competitor_behavior: "Brief description of how competitors typically price this product",
            margin_protection_tips: ["tip 1", "tip 2", "tip 3"],
            key_pricing_factors: ["factor 1", "factor 2", "factor 3"],
            confidence_note: "Brief note on estimate reliability and what affects accuracy",
          }, null, 2),
        ].join("\n"),
      },
    ],
    { temperature: 0.2, json: true }
  );

  try {
    return normalizeEstimate(JSON.parse(content));
  } catch {
    console.error("Unable to parse Groq market price estimate response:", content);
    throw new Error("Groq market price estimate returned invalid JSON.");
  }
}
