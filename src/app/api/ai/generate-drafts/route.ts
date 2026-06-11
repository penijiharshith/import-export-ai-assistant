import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { generateReplyDraft } from "@/lib/ai/generate-reply-draft";
import {
  AI_PROVIDER_ERROR_MESSAGE,
  aiConfigurationErrorBody,
  isAiConfigured,
  isAiConfigurationError,
} from "@/lib/ai/groq";
import type { ExtractedTradeDetails } from "@/lib/ai/extract-trade-details";

type EmailWithExtractionRow = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  category: string | null;
};

type ExistingDraftRow = {
  email_id: string;
};

type ExtractedTradeDetailsRow = ExtractedTradeDetails & {
  email_id: string;
};

type DraftGenerationError = {
  email_id?: string;
  step: string;
  message: string;
};

type SkippedEmail = {
  email_id: string;
  reason: string;
};

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

export async function POST(request: NextRequest) {
  const errors: DraftGenerationError[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    errors.push({ step: "config", message: "Supabase URL or anon key is missing." });
    return NextResponse.json({ processed: 0, skipped: 0, inserted: 0, errors }, { status: 500 });
  }

  const cookieResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    errors.push({ step: "auth", message: userError?.message ?? "User is not authenticated." });
    return jsonWithCookies({ processed: 0, skipped: 0, inserted: 0, errors }, { status: 401 }, cookieResponse);
  }

  if (!isAiConfigured()) {
    return jsonWithCookies(aiConfigurationErrorBody(), { status: 500 }, cookieResponse);
  }

  const { data: emails, error: emailError } = await supabase
    .from("email_messages")
    .select("id,sender,subject,body,category")
    .eq("user_id", user.id)
    .in("category", ["buyer_inquiry", "supplier_quote"])
    .neq("status", "archived")
    .order("received_at", { ascending: false })
    .limit(20);

  if (emailError) {
    errors.push({ step: "email_fetch", message: emailError.message });
    return jsonWithCookies({ processed: 0, skipped: 0, inserted: 0, errors }, { status: 500 }, cookieResponse);
  }

  const emailRows = (emails ?? []) as EmailWithExtractionRow[];

  if (emailRows.length === 0) {
    return jsonWithCookies({ processed: 0, skipped: 0, inserted: 0, errors }, undefined, cookieResponse);
  }

  const emailIds = emailRows.map((email) => email.id);
  const { data: extractions, error: extractionError } = await supabase
    .from("extracted_trade_details")
    .select("email_id,product,quantity,price,incoterm,origin_country,destination_country,delivery_date,payment_terms,missing_fields,risk_notes")
    .in("email_id", emailIds);

  if (extractionError) {
    errors.push({ step: "extraction_fetch", message: extractionError.message });
    return jsonWithCookies({ processed: 0, skipped: 0, inserted: 0, errors }, { status: 500 }, cookieResponse);
  }

  const extractionRows = (extractions ?? []) as ExtractedTradeDetailsRow[];
  const extractionByEmailId = new Map(extractionRows.map((extraction) => [extraction.email_id, extraction]));

  const { data: existingDrafts, error: existingError } = await supabase
    .from("ai_drafts")
    .select("email_id")
    .in("email_id", emailIds);

  if (existingError) {
    errors.push({ step: "existing_draft_fetch", message: existingError.message });
    return jsonWithCookies({ processed: 0, skipped: 0, inserted: 0, errors }, { status: 500 }, cookieResponse);
  }

  const existingEmailIds = new Set(((existingDrafts ?? []) as ExistingDraftRow[]).map((row) => row.email_id));
  const skippedEmails: SkippedEmail[] = [];
  const eligibleEmails = emailRows.filter((email) => {
    if (!extractionByEmailId.has(email.id)) {
      skippedEmails.push({ email_id: email.id, reason: "missing_extracted_trade_details" });
      return false;
    }

    if (existingEmailIds.has(email.id)) {
      skippedEmails.push({ email_id: email.id, reason: "draft_already_exists" });
      return false;
    }

    return true;
  });
  const emailsToDraft = eligibleEmails.slice(0, 10);

  eligibleEmails.slice(10).forEach((email) => {
    skippedEmails.push({ email_id: email.id, reason: "max_batch_limit_reached" });
  });

  let inserted = 0;

  for (const email of emailsToDraft) {
    const extraction = extractionByEmailId.get(email.id);

    if (!extraction) {
      skippedEmails.push({ email_id: email.id, reason: "missing_extracted_trade_details" });
      continue;
    }

    let generatedDraft;

    try {
      generatedDraft = await generateReplyDraft({
        subject: email.subject,
        body: email.body,
        sender: email.sender,
        category: email.category,
        extractedTradeDetails: extraction,
      });
    } catch (error) {
      console.error("Draft generation failed.", error);

      if (isAiConfigurationError(error)) {
        return jsonWithCookies(aiConfigurationErrorBody(), { status: 500 }, cookieResponse);
      }

      const message = AI_PROVIDER_ERROR_MESSAGE;
      errors.push({ email_id: email.id, step: "ai_generation", message });
      continue;
    }

    const safetyWarnings = [
      generatedDraft.safety_checks.price_committed ? "Warning: draft may commit price" : "Price not committed",
      generatedDraft.safety_checks.payment_terms_changed
        ? "Warning: draft may change payment terms"
        : "Payment terms not changed",
      generatedDraft.safety_checks.shipment_promise_made
        ? "Warning: draft may promise shipment date"
        : "Shipment promise avoided",
    ];

    const { error: insertError } = await supabase
      .from("ai_drafts")
      .insert({
        email_id: email.id,
        draft_type: generatedDraft.draft_type,
        subject: generatedDraft.subject,
        body: `${generatedDraft.body}\n\n---\nMissing questions:\n${generatedDraft.missing_questions.map((question) => `- ${question}`).join("\n") || "- None"}\n\nSafety checks:\n${safetyWarnings.map((warning) => `- ${warning}`).join("\n")}`,
        status: "needs_review",
        approved_by_user: false,
      });

    if (insertError) {
      errors.push({ email_id: email.id, step: "draft_insert", message: insertError.message });
      continue;
    }

    inserted += 1;
  }

  return jsonWithCookies(
    {
      ok: errors.length === 0,
      processed: emailsToDraft.length,
      skipped: skippedEmails.length,
      inserted,
      errors,
    },
    errors.length ? { status: inserted > 0 ? 207 : 500 } : undefined,
    cookieResponse
  );
}
