import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { compareSupplierQuotes, type SupplierQuote } from "@/lib/ai/compare-suppliers";
import {
  aiConfigurationErrorBody,
  aiProviderErrorBody,
  aiRateLimitErrorBody,
  isAiConfigured,
  isAiConfigurationError,
  isAiRateLimitError,
} from "@/lib/ai/groq";

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as { quoteIds?: unknown } | null;
  const quoteIds = Array.isArray(body?.quoteIds)
    ? body.quoteIds.filter((quoteId): quoteId is string => typeof quoteId === "string" && Boolean(quoteId))
    : [];

  if (quoteIds.length < 2) {
    return NextResponse.json({ error: "select_at_least_two_quotes" }, { status: 400 });
  }

  const cookieResponse = NextResponse.next({ request });
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

  const { data, error } = await supabase
    .from("supplier_quotes")
    .select("id,supplier_name,product,unit_price,currency,quantity,moq,incoterm,lead_time,payment_terms,destination_country,risk_notes")
    .eq("user_id", user.id)
    .in("id", quoteIds);

  if (error) {
    return jsonWithCookies({ error: "supplier_quotes_fetch_failed", message: error.message }, { status: 500 }, cookieResponse);
  }

  const quotes = (data ?? []) as SupplierQuote[];

  if (quotes.length < 2) {
    return jsonWithCookies({ error: "supplier_quotes_not_found" }, { status: 404 }, cookieResponse);
  }

  try {
    const comparison = await compareSupplierQuotes(quotes);

    return jsonWithCookies({ ok: true, comparison }, undefined, cookieResponse);
  } catch (comparisonError) {
    if (isAiRateLimitError(comparisonError)) {
      console.warn("ai_compare_suppliers_rate_limited", {
        route: "compare-suppliers",
        retryAfterSeconds: comparisonError.retryAfterSeconds,
      });

      return jsonWithCookies(
        aiRateLimitErrorBody(comparisonError.retryAfterSeconds),
        { status: 429 },
        cookieResponse
      );
    }

    console.error("ai_compare_suppliers_failed", {
      route: "compare-suppliers",
      message: comparisonError instanceof Error ? comparisonError.message.slice(0, 120) : "Unknown comparison failure.",
    });

    return jsonWithCookies(
      isAiConfigurationError(comparisonError) ? aiConfigurationErrorBody() : aiProviderErrorBody(),
      { status: isAiConfigurationError(comparisonError) ? 500 : 502 },
      cookieResponse
    );
  }
}
