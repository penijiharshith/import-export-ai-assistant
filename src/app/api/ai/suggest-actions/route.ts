import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  suggestNextAction,
  type BusinessRole,
  type NextActionSuggestion,
} from "@/lib/ai/suggest-next-action";
import {
  AI_PROVIDER_ERROR_MESSAGE,
  aiConfigurationErrorBody,
  isAiConfigured,
  isAiConfigurationError,
} from "@/lib/ai/groq";
import type { ExtractedTradeDetails } from "@/lib/ai/extract-trade-details";

const TRADE_CATEGORIES = ["buyer_inquiry", "supplier_quote", "shipment_update", "payment_issue", "payment", "complaint"];
const NO_TRADE_MESSAGE = "No trade-related action is required for these emails.";
const NEED_MORE_DETAILS_MESSAGE = "More trade details are needed before suggestions can be generated.";

type EmailRow = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  category: string | null;
};

type ExistingSuggestionRow = {
  email_id: string;
};

type ExtractionRow = Partial<ExtractedTradeDetails> & {
  email_id: string;
};

type SuggestionError = {
  email_id?: string;
  step: string;
  message: string;
};

type SuggestionResult = NextActionSuggestion & {
  email_id: string;
};

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function normalizeBusinessRole(value: unknown): BusinessRole {
  return value === "buyer" || value === "seller" || value === "both" ? value : "both";
}

function hasUsefulTradeDetails(details: Partial<ExtractedTradeDetails> | null | undefined) {
  if (!details) {
    return false;
  }

  return Boolean(
    details.product
    || details.quantity
    || details.price
    || details.incoterm
    || details.origin_country
    || details.destination_country
    || details.delivery_date
    || details.payment_terms
  );
}

export async function POST(request: NextRequest) {
  const errors: SuggestionError[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    errors.push({ step: "config", message: "Supabase URL or anon key is missing." });
    return NextResponse.json({ ok: false, processed: 0, inserted: 0, updated: 0, skipped: 0, suggestions: [], errors }, { status: 500 });
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
    return jsonWithCookies({ ok: false, processed: 0, inserted: 0, updated: 0, skipped: 0, suggestions: [], errors }, { status: 401 }, cookieResponse);
  }

  if (!isAiConfigured()) {
    return jsonWithCookies(aiConfigurationErrorBody(), { status: 500 }, cookieResponse);
  }

  const { data: profile, error: profileError } = await supabase
    .from("users_profile")
    .select("business_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    errors.push({ step: "profile_fetch", message: profileError.message });
    return jsonWithCookies({ ok: false, processed: 0, inserted: 0, updated: 0, skipped: 0, suggestions: [], errors }, { status: 500 }, cookieResponse);
  }

  const businessRole = normalizeBusinessRole(profile?.business_role);

  if (!profile) {
    const { error: profileInsertError } = await supabase.from("users_profile").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      business_role: businessRole,
    });

    if (profileInsertError) {
      errors.push({ step: "profile_upsert", message: profileInsertError.message });
      return jsonWithCookies({ ok: false, processed: 0, inserted: 0, updated: 0, skipped: 0, suggestions: [], errors }, { status: 500 }, cookieResponse);
    }
  }

  const { data: emails, error: emailError } = await supabase
    .from("email_messages")
    .select("id,sender,subject,body,category")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .in("category", TRADE_CATEGORIES)
    .order("received_at", { ascending: false })
    .limit(25);

  if (emailError) {
    errors.push({ step: "email_fetch", message: emailError.message });
    return jsonWithCookies({ ok: false, processed: 0, inserted: 0, updated: 0, skipped: 0, suggestions: [], errors }, { status: 500 }, cookieResponse);
  }

  const emailRows = (emails ?? []) as EmailRow[];

  if (emailRows.length === 0) {
    return jsonWithCookies(
      {
        ok: true,
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        suggestions: [],
        message: NO_TRADE_MESSAGE,
        errors,
      },
      undefined,
      cookieResponse
    );
  }

  const emailIds = emailRows.map((email) => email.id);
  const [
    extractionResult,
    existingSuggestionResult,
  ] = await Promise.all([
    supabase
      .from("extracted_trade_details")
      .select("email_id,product,quantity,price,incoterm,origin_country,destination_country,delivery_date,payment_terms,missing_fields,risk_notes")
      .in("email_id", emailIds),
    supabase
      .from("ai_action_suggestions")
      .select("email_id")
      .in("email_id", emailIds),
  ]);

  if (extractionResult.error) {
    errors.push({ step: "extraction_fetch", message: extractionResult.error.message });
    return jsonWithCookies({ ok: false, processed: 0, inserted: 0, updated: 0, skipped: 0, suggestions: [], errors }, { status: 500 }, cookieResponse);
  }

  if (existingSuggestionResult.error) {
    errors.push({ step: "existing_suggestion_fetch", message: existingSuggestionResult.error.message });
    return jsonWithCookies({ ok: false, processed: 0, inserted: 0, updated: 0, skipped: 0, suggestions: [], errors }, { status: 500 }, cookieResponse);
  }

  const extractionByEmailId = new Map(
    ((extractionResult.data ?? []) as ExtractionRow[]).map((extraction) => [extraction.email_id, extraction])
  );
  const existingSuggestionEmailIds = new Set(
    ((existingSuggestionResult.data ?? []) as ExistingSuggestionRow[]).map((suggestion) => suggestion.email_id)
  );
  const emailsToProcess = emailRows.slice(0, 10);
  let inserted = 0;
  let updated = 0;
  let skippedForDetails = 0;
  const suggestions: SuggestionResult[] = [];

  for (const email of emailsToProcess) {
    let suggestion;
    const extractedTradeDetails = extractionByEmailId.get(email.id) ?? null;

    if (!hasUsefulTradeDetails(extractedTradeDetails)) {
      skippedForDetails += 1;
      continue;
    }

    try {
      suggestion = await suggestNextAction({
        emailSubject: email.subject,
        emailBody: email.body,
        emailFrom: email.sender,
        category: email.category,
        extractedTradeDetails,
        businessRole,
      });
    } catch (error) {
      console.error("ai_suggest_action_failed", {
        route: "suggest-actions",
        message: error instanceof Error ? error.message.slice(0, 120) : "Unknown AI suggestion failure.",
      });

      if (isAiConfigurationError(error)) {
        return jsonWithCookies(aiConfigurationErrorBody(), { status: 500 }, cookieResponse);
      }

      errors.push({
        email_id: email.id,
        step: "ai_suggestion",
        message: AI_PROVIDER_ERROR_MESSAGE,
      });
      continue;
    }

    const suggestionValues = {
      user_id: user.id,
      email_id: email.id,
      role_context: suggestion.role_context,
      summary: suggestion.summary,
      business_goal: suggestion.business_goal,
      recommended_action: suggestion.recommended_action,
      urgency: suggestion.urgency,
      missing_info: suggestion.missing_info,
      risks: suggestion.risks,
      suggested_reply_type: suggestion.suggested_reply_type,
    };
    const hasExistingSuggestion = existingSuggestionEmailIds.has(email.id);
    const mutation = hasExistingSuggestion
      ? supabase
        .from("ai_action_suggestions")
        .update(suggestionValues)
        .eq("email_id", email.id)
        .eq("user_id", user.id)
      : supabase.from("ai_action_suggestions").insert(suggestionValues);
    const { error: insertError } = await mutation;

    if (insertError) {
      errors.push({
        email_id: email.id,
        step: hasExistingSuggestion ? "suggestion_update" : "suggestion_insert",
        message: insertError.message,
      });
      continue;
    }

    if (hasExistingSuggestion) {
      updated += 1;
    } else {
      inserted += 1;
    }

    suggestions.push({
      email_id: email.id,
      ...suggestion,
    });
  }

  const skipped = Math.max(emailRows.length - emailsToProcess.length, 0) + skippedForDetails;
  const message = suggestions.length > 0
    ? `Generated ${suggestions.length} action suggestions.`
    : NEED_MORE_DETAILS_MESSAGE;

  return jsonWithCookies(
    {
      ok: errors.length === 0,
      processed: emailsToProcess.length,
      inserted,
      updated,
      skipped,
      suggestions,
      message,
      errors,
    },
    errors.length ? { status: suggestions.length > 0 ? 207 : 502 } : undefined,
    cookieResponse
  );
}
