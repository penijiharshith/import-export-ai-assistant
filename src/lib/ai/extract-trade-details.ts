import type { EmailCategory } from "@/lib/ai/classify-email";
import { assertGroqApiKey, getGroqJsonContent, groq, GROQ_MODEL } from "@/lib/ai/groq";

export type ExtractTradeDetailsInput = {
  subject: string | null;
  body: string | null;
  sender: string | null;
  category: EmailCategory | string | null;
};

export type ExtractedTradeDetails = {
  product: string | null;
  quantity: string | null;
  price: string | null;
  incoterm: string | null;
  origin_country: string | null;
  destination_country: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  missing_fields: string[];
  risk_notes: string[];
};

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 220) : null;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 180))
    .slice(0, 12);
}

function normalizeTradeDetails(value: unknown): ExtractedTradeDetails {
  const candidate = value && typeof value === "object" ? (value as Partial<ExtractedTradeDetails>) : {};

  return {
    product: nullableString(candidate.product),
    quantity: nullableString(candidate.quantity),
    price: nullableString(candidate.price),
    incoterm: nullableString(candidate.incoterm),
    origin_country: nullableString(candidate.origin_country),
    destination_country: nullableString(candidate.destination_country),
    delivery_date: nullableString(candidate.delivery_date),
    payment_terms: nullableString(candidate.payment_terms),
    missing_fields: stringArray(candidate.missing_fields),
    risk_notes: stringArray(candidate.risk_notes),
  };
}

export async function extractTradeDetails({
  subject,
  body,
  sender,
  category,
}: ExtractTradeDetailsInput): Promise<ExtractedTradeDetails> {
  assertGroqApiKey();

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extract structured import-export trade details from buyer inquiry or supplier quote emails. Return only valid JSON with exactly these keys: product, quantity, price, incoterm, origin_country, destination_country, delivery_date, payment_terms, missing_fields, risk_notes. Use null when a field is absent. missing_fields and risk_notes must be arrays of strings. risk_notes should list short practical risks, not legal advice.",
      },
      {
        role: "user",
        content: JSON.stringify({
          sender: sender ?? "",
          subject: subject ?? "",
          body: body ?? "",
          category: category ?? "",
        }),
      },
    ],
  });

  return normalizeTradeDetails(JSON.parse(getGroqJsonContent(response)));
}
