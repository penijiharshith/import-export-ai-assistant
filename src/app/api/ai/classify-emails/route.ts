import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyEmail, type EmailCategory } from "@/lib/ai/classify-email";
import {
  aiConfigurationErrorBody,
  formatRetryMinutes,
  isAiConfigured,
  isAiRateLimitError,
} from "@/lib/ai/groq";

type EmailRow = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  category: string | null;
  classification_status: string | null;
};

type ClassificationResult = {
  email_id: string;
  category: EmailCategory;
  confidence: number;
  reason: string;
};

const TRADE_CATEGORIES: EmailCategory[] = [
  "buyer_inquiry",
  "supplier_quote",
  "shipment_update",
  "payment_issue",
  "complaint",
];

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function getRateLimitMessage(unprocessed: number, retryAfterSeconds: number | null) {
  const retryText = retryAfterSeconds
    ? ` Try again in about ${formatRetryMinutes(retryAfterSeconds)}.`
    : " Try again later.";

  return `AI quota reached. ${unprocessed} ${unprocessed === 1 ? "email remains" : "emails remain"} unprocessed.${retryText}`;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
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
    return jsonWithCookies({ error: "not_authenticated" }, { status: 401 }, cookieResponse);
  }

  if (!isAiConfigured()) {
    return jsonWithCookies(aiConfigurationErrorBody(), { status: 500 }, cookieResponse);
  }

  const { data: emails, error: emailError } = await supabase
    .from("email_messages")
    .select("id,sender,subject,body,category,classification_status")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .or("category.is.null,category.eq.unclassified,classification_status.eq.retry")
    .order("received_at", { ascending: false })
    .limit(100);

  if (emailError) {
    console.error("ai_classify_email_fetch_failed", {
      route: "classify-emails",
      code: emailError.code,
      message: emailError.message,
    });
    return jsonWithCookies(
      { error: "email_fetch_failed", message: "Unable to fetch emails for classification." },
      { status: 500 },
      cookieResponse
    );
  }

  const emailRows = (emails ?? []) as EmailRow[];
  const results: ClassificationResult[] = [];
  let failed = 0;

  for (const email of emailRows) {
    let classification;

    try {
      classification = await classifyEmail({
        subject: email.subject,
        body: email.body,
        sender: email.sender,
      });
    } catch (classificationError) {
      if (isAiRateLimitError(classificationError)) {
        const retryAfterSeconds = classificationError.retryAfterSeconds;
        const unprocessed = emailRows.length - results.length;
        const message = getRateLimitMessage(unprocessed, retryAfterSeconds);

        await supabase
          .from("email_messages")
          .update({ classification_status: "retry" })
          .eq("id", email.id)
          .eq("user_id", user.id);

        console.warn("ai_classify_rate_limited", {
          route: "classify-emails",
          retryAfterSeconds,
          unprocessed,
        });

        const tradeEmails = results.filter((result) => TRADE_CATEGORIES.includes(result.category)).length;
        const otherEmails = results.filter((result) => result.category === "other").length;

        return jsonWithCookies(
          {
            ok: true,
            partial: true,
            classified: results.length,
            tradeEmails,
            otherEmails,
            unprocessed,
            failed,
            rateLimited: true,
            retryAfterSeconds,
            message,
            results,
          },
          undefined,
          cookieResponse
        );
      }

      failed += 1;
      await supabase
        .from("email_messages")
        .update({ classification_status: "retry" })
        .eq("id", email.id)
        .eq("user_id", user.id);
      console.warn("ai_classify_email_failed", {
        route: "classify-emails",
        message: classificationError instanceof Error ? classificationError.message.slice(0, 120) : "Unknown AI classification failure.",
        failedEmailCount: failed,
      });
      continue;
    }

    const { error: updateError } = await supabase
      .from("email_messages")
      .update({
        category: classification.category,
        classification_confidence: classification.confidence,
        classification_reason: classification.reason,
        classification_status: "classified",
        status: "new",
      })
      .eq("id", email.id)
      .eq("user_id", user.id);

    if (updateError) {
      failed += 1;
      console.error("ai_classify_email_update_failed", {
        route: "classify-emails",
        code: updateError.code,
        message: updateError.message,
        failedEmailCount: failed,
      });
      continue;
    }

    results.push({
      email_id: email.id,
      ...classification,
    });
  }

  const tradeEmails = results.filter((result) => TRADE_CATEGORIES.includes(result.category)).length;
  const otherEmails = results.filter((result) => result.category === "other").length;

  return jsonWithCookies(
    {
      ok: true,
      classified: results.length,
      tradeEmails,
      otherEmails,
      failed,
      fallbackCount: 0,
      partial: false,
      rateLimited: false,
      unprocessed: 0,
      results,
    },
    undefined,
    cookieResponse
  );
}
