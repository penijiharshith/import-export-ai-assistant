import OpenAI from "openai";

export const EMAIL_CATEGORIES = [
  "buyer_inquiry",
  "supplier_quote",
  "payment",
  "shipment",
  "complaint",
  "other",
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export type ClassifyEmailInput = {
  subject: string | null;
  body: string | null;
  sender: string | null;
};

export type EmailClassification = {
  category: EmailCategory;
  confidence: number;
  reason: string;
};

function isEmailCategory(category: string): category is EmailCategory {
  return EMAIL_CATEGORIES.includes(category as EmailCategory);
}

function normalizeClassification(value: unknown): EmailClassification {
  const fallback: EmailClassification = {
    category: "other",
    confidence: 0,
    reason: "Unable to classify confidently.",
  };

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<EmailClassification>;
  const category = typeof candidate.category === "string" && isEmailCategory(candidate.category)
    ? candidate.category
    : fallback.category;
  const confidence = typeof candidate.confidence === "number"
    ? Math.min(1, Math.max(0, candidate.confidence))
    : fallback.confidence;
  const reason = typeof candidate.reason === "string" && candidate.reason.trim()
    ? candidate.reason.trim().slice(0, 180)
    : fallback.reason;

  return {
    category,
    confidence,
    reason,
  };
}

export async function classifyEmail({
  subject,
  body,
  sender,
}: ClassifyEmailInput): Promise<EmailClassification> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "Classify import-export related emails. Return only JSON with category, confidence, and reason. Allowed categories: buyer_inquiry, supplier_quote, payment, shipment, complaint, other.",
      },
      {
        role: "user",
        content: JSON.stringify({
          sender: sender ?? "",
          subject: subject ?? "",
          body: body ?? "",
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "email_classification",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: {
              type: "string",
              enum: EMAIL_CATEGORIES,
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            reason: {
              type: "string",
            },
          },
          required: ["category", "confidence", "reason"],
        },
      },
    },
  });

  const outputText = response.output_text;

  return normalizeClassification(JSON.parse(outputText));
}
