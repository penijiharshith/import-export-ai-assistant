import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { estimateMarketPrice } from "@/lib/ai/estimate-market-price";
import {
  aiConfigurationErrorBody,
  aiProviderErrorBody,
  isAiConfigured,
  isAiConfigurationError,
} from "@/lib/ai/groq";

type ExtractionRow = {
  product: string | null;
  quantity: string | null;
  price: string | null;
  incoterm: string | null;
  origin_country: string | null;
  destination_country: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  missing_fields: unknown;
  risk_notes: unknown;
  email_messages?: {
    user_id?: string | null;
    category?: string | null;
  } | Array<{
    user_id?: string | null;
    category?: string | null;
  }> | null;
};

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function joinedEmail(row: ExtractionRow) {
  return Array.isArray(row.email_messages) ? row.email_messages[0] : row.email_messages;
}

function tradeDetailsRecord(row: ExtractionRow) {
  return Object.fromEntries(
    Object.entries({
      product: row.product,
      quantity: row.quantity,
      current_price_or_target_price: row.price,
      incoterm: row.incoterm,
      origin_country: row.origin_country,
      destination_country: row.destination_country,
      delivery_date: row.delivery_date,
      payment_terms: row.payment_terms,
      missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields.join(", ") : "",
      risk_notes: Array.isArray(row.risk_notes) ? row.risk_notes.join("; ") : "",
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]))
  );
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as { emailId?: unknown } | null;
  const emailId = typeof body?.emailId === "string" ? body.emailId : "";

  if (!emailId) {
    return NextResponse.json({ error: "missing_email_id" }, { status: 400 });
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
    .from("extracted_trade_details")
    .select("product,quantity,price,incoterm,origin_country,destination_country,delivery_date,payment_terms,missing_fields,risk_notes,email_messages!inner(user_id,category)")
    .eq("email_id", emailId)
    .eq("email_messages.user_id", user.id)
    .eq("email_messages.category", "buyer_inquiry")
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: "extraction_fetch_failed", message: error.message }, { status: 500 }, cookieResponse);
  }

  if (!data) {
    return jsonWithCookies({ error: "buyer_inquiry_extraction_not_found" }, { status: 404 }, cookieResponse);
  }

  const extraction = data as ExtractionRow;
  const email = joinedEmail(extraction);

  if (email?.user_id !== user.id || email.category !== "buyer_inquiry") {
    return jsonWithCookies({ error: "buyer_inquiry_extraction_not_found" }, { status: 404 }, cookieResponse);
  }

  try {
    const estimate = await estimateMarketPrice(tradeDetailsRecord(extraction));

    return jsonWithCookies({ ok: true, estimate }, undefined, cookieResponse);
  } catch (estimateError) {
    console.error("Unable to estimate market pricing.", estimateError);

    return jsonWithCookies(
      isAiConfigurationError(estimateError) ? aiConfigurationErrorBody() : aiProviderErrorBody(),
      { status: isAiConfigurationError(estimateError) ? 500 : 502 },
      cookieResponse
    );
  }
}
