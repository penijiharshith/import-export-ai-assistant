import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { suggestHSCode } from "@/lib/ai/suggest-hs-code";

type ExtractionRow = {
  product: string | null;
  destination_country: string | null;
  email_messages?: {
    user_id?: string | null;
  } | Array<{
    user_id?: string | null;
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

function hasProduct(value: string | null) {
  const normalized = value?.trim().toLowerCase();

  return Boolean(normalized && normalized !== "not provided" && normalized !== "not extracted yet");
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

  const { data, error } = await supabase
    .from("extracted_trade_details")
    .select("product,destination_country,email_messages!inner(user_id)")
    .eq("email_id", emailId)
    .eq("email_messages.user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: "extraction_fetch_failed", message: error.message }, { status: 500 }, cookieResponse);
  }

  if (!data) {
    return jsonWithCookies({ error: "extraction_not_found" }, { status: 404 }, cookieResponse);
  }

  const extraction = data as ExtractionRow;
  const email = joinedEmail(extraction);

  if (email?.user_id !== user.id || !hasProduct(extraction.product)) {
    return jsonWithCookies({ error: "extracted_product_not_found" }, { status: 404 }, cookieResponse);
  }

  try {
    const result = await suggestHSCode(extraction.product as string, extraction.destination_country ?? undefined);

    return jsonWithCookies({ result }, undefined, cookieResponse);
  } catch (suggestionError) {
    const message = suggestionError instanceof Error ? suggestionError.message : "Unable to suggest an HS code.";

    return jsonWithCookies({ error: "hs_code_suggestion_failed", message }, { status: 502 }, cookieResponse);
  }
}
