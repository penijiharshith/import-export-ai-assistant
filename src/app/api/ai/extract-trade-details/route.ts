import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractTradeDetails } from "@/lib/ai/extract-trade-details";

type EmailRow = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  category: string | null;
};

type ExistingExtractionRow = {
  email_id: string;
};

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

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "missing_groq_api_key" }, { status: 500 });
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

  const { data: emails, error: emailError } = await supabase
    .from("email_messages")
    .select("id,sender,subject,body,category")
    .eq("user_id", user.id)
    .in("category", ["buyer_inquiry", "supplier_quote"])
    .order("received_at", { ascending: false })
    .limit(20);

  if (emailError) {
    return jsonWithCookies({ error: "email_fetch_failed", message: emailError.message }, { status: 500 }, cookieResponse);
  }

  const emailRows = (emails ?? []) as EmailRow[];

  if (emailRows.length === 0) {
    return jsonWithCookies({ extracted: 0, results: [] }, undefined, cookieResponse);
  }

  const { data: existingExtractions, error: existingError } = await supabase
    .from("extracted_trade_details")
    .select("email_id")
    .in(
      "email_id",
      emailRows.map((email) => email.id)
    );

  if (existingError) {
    return jsonWithCookies(
      { error: "existing_extraction_fetch_failed", message: existingError.message },
      { status: 500 },
      cookieResponse
    );
  }

  const existingEmailIds = new Set(
    ((existingExtractions ?? []) as ExistingExtractionRow[]).map((row) => row.email_id)
  );
  const emailsToExtract = emailRows.filter((email) => !existingEmailIds.has(email.id)).slice(0, 10);
  const results = [];

  for (const email of emailsToExtract) {
    const details = await extractTradeDetails({
      subject: email.subject,
      body: email.body,
      sender: email.sender,
      category: email.category,
    });

    const { error: insertError } = await supabase.from("extracted_trade_details").insert({
      email_id: email.id,
      ...details,
    });

    if (insertError) {
      return jsonWithCookies(
        {
          error: "extraction_insert_failed",
          message: insertError.message,
          extracted: results.length,
        },
        { status: 500 },
        cookieResponse
      );
    }

    results.push({
      email_id: email.id,
      ...details,
    });
  }

  return jsonWithCookies(
    {
      extracted: results.length,
      results,
    },
    undefined,
    cookieResponse
  );
}
