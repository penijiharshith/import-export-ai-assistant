import type { ExtractedTradeDetails } from "@/lib/ai/extract-trade-details";
import { getOllamaJsonContent, OLLAMA_MODEL, ollama } from "@/lib/ai/ollama";
import { TRADE_COPILOT_SYSTEM_PROMPT } from "@/lib/ai/trade-copilot-system-prompt";

export type BusinessRole = "buyer" | "seller" | "both";

export type RoleContext = "buyer" | "seller" | "coordinator";

export type SuggestedReplyType =
  | "quotation"
  | "negotiation"
  | "clarification"
  | "follow_up"
  | "payment_confirmation"
  | "shipment_update"
  | "archive";

export type SuggestNextActionInput = {
  emailSubject: string | null;
  emailBody: string | null;
  emailFrom: string | null;
  category: string | null;
  extractedTradeDetails: Partial<ExtractedTradeDetails> | null;
  businessRole: BusinessRole;
};

export type NextActionSuggestion = {
  summary: string;
  role_context: RoleContext;
  business_goal: string;
  recommended_action: string;
  urgency: "low" | "medium" | "high";
  missing_info: string[];
  risks: string[];
  suggested_reply_type: SuggestedReplyType;
};

function cleanString(value: unknown, fallback: string, maxLength = 900) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 220))
    .slice(0, 10);
}

function normalizeRoleContext(value: unknown): RoleContext {
  return value === "buyer" || value === "seller" || value === "coordinator" ? value : "coordinator";
}

function normalizeUrgency(value: unknown): NextActionSuggestion["urgency"] {
  return value === "low" || value === "high" ? value : "medium";
}

function normalizeSuggestedReplyType(value: unknown): SuggestedReplyType {
  const allowedTypes: SuggestedReplyType[] = [
    "quotation",
    "negotiation",
    "clarification",
    "follow_up",
    "payment_confirmation",
    "shipment_update",
    "archive",
  ];

  return allowedTypes.includes(value as SuggestedReplyType) ? (value as SuggestedReplyType) : "clarification";
}

function normalizeSuggestion(value: unknown): NextActionSuggestion {
  const candidate = value && typeof value === "object" ? value as Partial<NextActionSuggestion> : {};

  return {
    summary: cleanString(candidate.summary, "Trade email requires review."),
    role_context: normalizeRoleContext(candidate.role_context),
    business_goal: cleanString(candidate.business_goal, "Handle the trade communication safely."),
    recommended_action: cleanString(candidate.recommended_action, "Review the email and decide the next response."),
    urgency: normalizeUrgency(candidate.urgency),
    missing_info: cleanStringArray(candidate.missing_info),
    risks: cleanStringArray(candidate.risks),
    suggested_reply_type: normalizeSuggestedReplyType(candidate.suggested_reply_type),
  };
}

function hasCompleteBuyerInquiry(details: Partial<ExtractedTradeDetails> | null) {
  return Boolean(
    details?.product
    && details.quantity
    && details.price
    && details.payment_terms
    && details.delivery_date
    && (!details.missing_fields || details.missing_fields.length === 0)
  );
}

export async function suggestNextAction({
  emailSubject,
  emailBody,
  emailFrom,
  category,
  extractedTradeDetails,
  businessRole,
}: SuggestNextActionInput): Promise<NextActionSuggestion> {
  const response = await ollama.chat({
    model: OLLAMA_MODEL,
    options: { temperature: 0.2 },
    format: "json",
    messages: [
      {
        role: "system",
        content: [
          TRADE_COPILOT_SYSTEM_PROMPT,
          "Return strict JSON with exactly these keys:",
          "summary, role_context, business_goal, recommended_action, urgency, missing_info, risks, suggested_reply_type.",
          'role_context must be one of: "buyer", "seller", "coordinator".',
          'urgency must be one of: "low", "medium", "high".',
          'suggested_reply_type must be one of: "quotation", "negotiation", "clarification", "follow_up", "payment_confirmation", "shipment_update", "archive".',
          "missing_info and risks must be arrays of short strings.",
          'If email is not trade-related, suggested_reply_type must be "archive".',
          'If enough buyer inquiry details exist, recommend suggested_reply_type "quotation".',
          'For a buyer_inquiry where product, quantity, price, payment_terms, and delivery_date are present and missing_fields is empty: do not request missing details. Recommend preparing a quotation and confirming final pricing, quotation validity, production capacity, and the latest shipment schedule.',
          'If supplier quote has high price, strict MOQ, weak delivery, or risky payment terms, recommend suggested_reply_type "negotiation".',
          "If shipment or payment issue exists, recommend a coordinator action.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          business_role: businessRole,
          email_from: emailFrom ?? "",
          email_subject: emailSubject ?? "",
          email_body: emailBody ?? "",
          category: category ?? "",
          extracted_trade_details: extractedTradeDetails ?? {},
        }),
      },
    ],
  });

  const suggestion = normalizeSuggestion(JSON.parse(getOllamaJsonContent(response)));

  if (category === "buyer_inquiry" && hasCompleteBuyerInquiry(extractedTradeDetails)) {
    return {
      ...suggestion,
      recommended_action: "Prepare and send quotation. Confirm final pricing, quotation validity period, production capacity, and latest shipment schedule.",
      missing_info: [],
      suggested_reply_type: "quotation",
    };
  }

  return suggestion;
}
