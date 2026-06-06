import { chat } from "@/lib/ai/groq";

export interface HSCodeResult {
  product: string;
  hs_code: string;
  description: string;
  chapter: string;
  common_duty_range: string;
  notes: string[];
  confidence: "high" | "medium" | "low";
  disclaimer: string;
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

function normalizeConfidence(value: unknown): HSCodeResult["confidence"] {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeResult(value: unknown, product: string): HSCodeResult {
  const candidate = value && typeof value === "object" ? value as Partial<HSCodeResult> : {};

  return {
    product: cleanString(candidate.product, product),
    hs_code: cleanString(candidate.hs_code, "Classification unavailable"),
    description: cleanString(candidate.description, "Description unavailable"),
    chapter: cleanString(candidate.chapter, "Chapter unavailable"),
    common_duty_range: cleanString(candidate.common_duty_range, "Verify with customs broker"),
    notes: cleanStringArray(candidate.notes),
    confidence: normalizeConfidence(candidate.confidence),
    disclaimer: cleanString(
      candidate.disclaimer,
      "HS codes are indicative. Verify with a licensed customs broker before use."
    ),
  };
}

export async function suggestHSCode(product: string, destinationCountry?: string): Promise<HSCodeResult> {
  const content = await chat(
    [
      {
        role: "system",
        content: [
          "You are an expert customs classification specialist with 20 years of experience in the Harmonized System (HS) nomenclature used in international trade.",
          "",
          "CRITICAL RULES - follow strictly:",
          "",
          "1. ALWAYS return a full 6-digit HS code in format XXXX.XX (e.g. 7323.93, 6305.20, 9617.00)",
          "2. NEVER return a 4-digit heading like 73.21 - that is incomplete and wrong",
          "3. NEVER guess - use the most specific subheading available",
          "",
          "PRODUCT CLASSIFICATION GUIDE - use these exactly:",
          "- Cotton tote bags / shopping bags / promotional bags -> 6305.20 (NOT Chapter 42)",
          "- Cotton tote bags are NOT handbags - Chapter 42 is for leather travel bags only",
          "- Stainless steel water bottles (non-insulated) -> 7323.93",
          "- Stainless steel vacuum / insulated / double-wall bottles -> 9617.00",
          "- Plastic water bottles -> 3924.10",
          "- Glass bottles -> 7013.49",
          "",
          "CLASSIFICATION METHOD:",
          "- Step 1: Identify the PRIMARY MATERIAL",
          "- Step 2: Identify the PRIMARY USE",
          "- Step 3: Match to the most specific 6-digit subheading",
          "- Step 4: If two codes are possible, mention both in notes and pick the most common one",
          "",
          "Always include this disclaimer exactly:",
          "\"HS codes are indicative estimates only. Always verify with a licensed customs broker or freight forwarder before use in official trade documents.\"",
          "",
          "Respond ONLY with valid JSON. No text, no explanation outside the JSON object.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "Suggest the HS code for this product:",
          `Product: ${product}`,
          `Destination country: ${destinationCountry || "not specified"}`,
          "",
          "Return ONLY this JSON:",
          JSON.stringify({
            product: "...",
            hs_code: "XXXX.XX",
            description: "Official HS code description",
            chapter: "Chapter XX - ...",
            common_duty_range: "X% - X%",
            notes: ["note 1", "note 2"],
            confidence: "high|medium|low",
            disclaimer: "HS codes are indicative. Verify with a licensed customs broker before use.",
          }, null, 2),
        ].join("\n"),
      },
    ],
    { temperature: 0.1, json: true }
  );

  try {
    return normalizeResult(JSON.parse(content), product);
  } catch {
    console.error("Unable to parse Groq HS code response:", content);
    throw new Error("Groq HS code suggestion returned invalid JSON.");
  }
}
