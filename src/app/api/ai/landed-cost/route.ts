import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { calculateLandedCost } from "@/lib/ai/calculate-landed-cost";

type ExtractionRow = {
  product: string | null;
  quantity: string | null;
  price: string | null;
  incoterm: string | null;
  origin_country: string | null;
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

function hasValue(value: string | null) {
  const normalized = value?.trim().toLowerCase();

  return Boolean(normalized && normalized !== "not provided" && normalized !== "not extracted yet");
}

function inferCurrency(price: string) {
  if (/\bEUR\b|EUR\s*[\d,.]+|EUR|euro/i.test(price)) {
    return "EUR";
  }

  if (/\bGBP\b|GBP\s*[\d,.]+|pound/i.test(price)) {
    return "GBP";
  }

  if (/\bINR\b|INR\s*[\d,.]+|rupee/i.test(price)) {
    return "INR";
  }

  if (/\bCNY\b|RMB|yuan/i.test(price)) {
    return "CNY";
  }

  if (/\bAED\b|dirham/i.test(price)) {
    return "AED";
  }

  return "USD";
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
    .select("product,quantity,price,incoterm,origin_country,destination_country,email_messages!inner(user_id)")
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

  if (email?.user_id !== user.id || !hasValue(extraction.price) || !hasValue(extraction.incoterm)) {
    return jsonWithCookies({ error: "landed_cost_details_not_found" }, { status: 404 }, cookieResponse);
  }

  try {
    const result = await calculateLandedCost({
      product: hasValue(extraction.product) ? extraction.product as string : "Product not specified",
      quantity: hasValue(extraction.quantity) ? extraction.quantity as string : "Quantity not specified",
      unit_price: extraction.price as string,
      incoterm: extraction.incoterm as string,
      origin_country: hasValue(extraction.origin_country) ? extraction.origin_country as string : "China",
      destination_country: hasValue(extraction.destination_country) ? extraction.destination_country as string : "Destination not specified",
      currency: inferCurrency(extraction.price as string),
    });

    return jsonWithCookies({ result }, undefined, cookieResponse);
  } catch (calculationError) {
    const message = calculationError instanceof Error ? calculationError.message : "Unable to calculate landed cost.";

    return jsonWithCookies({ error: "landed_cost_calculation_failed", message }, { status: 502 }, cookieResponse);
  }
}
