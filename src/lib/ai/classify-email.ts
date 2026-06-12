import { AiProviderError, chat } from "@/lib/ai/groq";
import { parseJsonObject } from "@/lib/ai/json";

export const EMAIL_CATEGORIES = [
  "buyer_inquiry",
  "supplier_quote",
  "shipment_update",
  "payment_issue",
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

export function normalizeEmailCategory(category: unknown): EmailCategory {
  if (typeof category !== "string") {
    return "other";
  }

  const normalized = category.trim().toLowerCase();

  if (normalized === "payment") {
    return "payment_issue";
  }

  return isEmailCategory(normalized) ? normalized : "other";
}

const MAX_BODY_SNIPPET_LENGTH = 700;

function normalizeEmailSnippet(value: string | null) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_BODY_SNIPPET_LENGTH);
}

function normalizeClassification(value: unknown): EmailClassification | null {
  const fallback: EmailClassification = {
    category: "other",
    confidence: 0,
    reason: "Unable to classify confidently.",
  };

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<EmailClassification>;
  if (typeof candidate.category !== "string") {
    return null;
  }

  const category = normalizeEmailCategory(candidate.category);
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

export function parseClassification(outputText: string): EmailClassification | null {
  return normalizeClassification(parseJsonObject(outputText));
}

export async function classifyEmail({
  subject,
  body,
  sender,
}: ClassifyEmailInput): Promise<EmailClassification> {
  const outputText = await chat(
    [
      {
        role: "system",
        content:
          [
            "Classify import-export trade email summaries. Return only valid JSON with exactly these keys: category, confidence, reason.",
            "Allowed categories: buyer_inquiry, supplier_quote, shipment_update, payment_issue, complaint, other.",
            "confidence must be a number from 0 to 1.",
            "",
            "Category rules:",
            "buyer_inquiry: buyer/importer asks for quotation, RFQ, price, pricing, MOQ, sample, catalog, delivery time, shipment possibility, CIF/FOB/EXW/DDP Incoterms, product availability, export/import product inquiry, or asks supplier to quote.",
            "supplier_quote: supplier/exporter responds with quotation, offer price, supplier pricing, lead time, MOQ, availability, export offer, proforma-style offer, or terms in response to an inquiry.",
            "shipment_update: sender reports an existing shipment was dispatched, vessel/container status, BL update, tracking update, ETA update, or cargo movement already in progress.",
            "payment_issue: invoice, payment, remittance, bank transfer, LC/letter of credit, payment proof, payment due, payment confirmation, or payment dispute.",
            "complaint: quality complaint, damaged goods, shortage, delay complaint, claim, dispute, rejection, or corrective action request.",
            "other: newsletters, job alerts, OTPs, social media notifications, LinkedIn messages, marketing, promotions, ads, receipts unrelated to import/export trade, personal emails, unrelated emails, or generic introductions without a concrete trade request or offer.",
            "",
            "Strict priority rule: If an email asks for pricing, quotation, MOQ, shipment, delivery, Incoterms, or export/import products, classify it as buyer_inquiry, even if it mentions shipment or delivery.",
            "Use shipment_update only when the email gives an update about an existing shipment, not when it asks whether shipment/delivery is possible.",
            "",
            "Examples:",
            'Subject: "RFQ for 2 containers of basmati rice CIF Jebel Ali" -> {"category":"buyer_inquiry","confidence":0.95,"reason":"Buyer is requesting quotation with Incoterm and product details."}',
            'Subject: "Please quote MOQ and FOB price for cotton towels" -> {"category":"buyer_inquiry","confidence":0.95,"reason":"Email asks for MOQ and FOB pricing."}',
            'Subject: "Our offer for 500 cartons, lead time 20 days" -> {"category":"supplier_quote","confidence":0.9,"reason":"Supplier is providing price/lead time offer."}',
            'Subject: "Container dispatched - BL copy attached" -> {"category":"shipment_update","confidence":0.92,"reason":"Email provides dispatch and BL update for shipment."}',
            'Subject: "Payment remittance advice for invoice 7842" -> {"category":"payment_issue","confidence":0.94,"reason":"Email concerns payment/remittance."}',
            'Subject: "May newsletter and product promotions" -> {"category":"other","confidence":0.9,"reason":"Marketing newsletter, not a specific trade request."}',
            'Subject: "Your LinkedIn verification code" -> {"category":"other","confidence":0.98,"reason":"OTP/social notification, not a trade email."}',
          ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          sender: sender ?? "",
          subject: subject ?? "",
          snippet: normalizeEmailSnippet(body),
        }),
      },
    ],
    { temperature: 0.1, json: true }
  );

  const classification = parseClassification(outputText);

  if (!classification) {
    throw new AiProviderError("AI provider returned invalid classification JSON.");
  }

  return classification;
}
