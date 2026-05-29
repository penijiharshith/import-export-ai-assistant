import type { ExtractedTradeDetails } from "@/lib/ai/extract-trade-details";
import { assertGroqApiKey, getGroqJsonContent, groq, GROQ_MODEL } from "@/lib/ai/groq";

export type GenerateReplyDraftInput = {
  subject: string | null;
  body: string | null;
  sender: string | null;
  category: string | null;
  extractedTradeDetails: ExtractedTradeDetails;
};

export type GeneratedReplyDraft = {
  subject: string;
  body: string;
  draft_type: "reply" | "negotiation" | "clarification";
  missing_questions: string[];
  safety_checks: {
    price_committed: boolean;
    payment_terms_changed: boolean;
    shipment_promise_made: boolean;
  };
};

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 4000) : fallback;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 220))
    .slice(0, 12);
}

function normalizeDraft(value: unknown): GeneratedReplyDraft {
  const candidate = value && typeof value === "object" ? (value as Partial<GeneratedReplyDraft>) : {};
  const draftType = candidate.draft_type === "negotiation" || candidate.draft_type === "clarification"
    ? candidate.draft_type
    : "reply";
  const safetyChecks = (candidate.safety_checks ?? {}) as Partial<GeneratedReplyDraft["safety_checks"]>;

  return {
    subject: stringValue(candidate.subject, "Re: Trade inquiry"),
    body: stringValue(candidate.body, "Thank you for your email. We will review the details and respond shortly."),
    draft_type: draftType,
    missing_questions: stringArray(candidate.missing_questions),
    safety_checks: {
      price_committed: Boolean(safetyChecks.price_committed),
      payment_terms_changed: Boolean(safetyChecks.payment_terms_changed),
      shipment_promise_made: Boolean(safetyChecks.shipment_promise_made),
    },
  };
}

export async function generateReplyDraft({
  subject,
  body,
  sender,
  category,
  extractedTradeDetails,
}: GenerateReplyDraftInput): Promise<GeneratedReplyDraft> {
  assertGroqApiKey();

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Generate concise professional import-export email reply drafts. Never finalize price automatically. Never promise shipment dates. Never change payment terms automatically. Ask politely for missing trade details. Human approval is mandatory before sending. Return only valid JSON with exactly these keys: subject, body, draft_type, missing_questions, safety_checks. draft_type must be reply, negotiation, or clarification. missing_questions must be an array of strings. safety_checks must include boolean keys price_committed, payment_terms_changed, shipment_promise_made.",
      },
      {
        role: "user",
        content: JSON.stringify({
          sender: sender ?? "",
          subject: subject ?? "",
          body: body ?? "",
          category: category ?? "",
          extractedTradeDetails,
        }),
      },
    ],
  });

  return normalizeDraft(JSON.parse(getGroqJsonContent(response)));
}
