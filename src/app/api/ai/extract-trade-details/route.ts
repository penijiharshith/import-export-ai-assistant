import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractTradeDetails } from "@/lib/ai/extract-trade-details";
import {
  aiConfigurationErrorBody,
  aiProviderErrorBody,
  isAiConfigured,
  isAiConfigurationError,
} from "@/lib/ai/groq";

type EmailRow = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  category: string | null;
};

type ExistingExtractionRow = {
  id: string;
  email_id: string;
};

const reminderMap: Record<string, { note: string; days: number; type: string }> = {
  buyer_inquiry: {
    type: "buyer_no_reply",
    note: "Follow up if buyer has not responded to your quotation",
    days: 3,
  },
  supplier_quote: {
    type: "quote_expiring",
    note: "Review supplier quote before it expires",
    days: 5,
  },
  payment: {
    type: "payment_pending",
    note: "Confirm payment has been received or follow up",
    days: 2,
  },
  shipment_update: {
    type: "shipment_deadline",
    note: "Confirm shipment status and update buyer",
    days: 1,
  },
};

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function parseNumericValue(value: string | null | undefined) {
  const match = value?.replaceAll(",", "").match(/\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function parseIntegerValue(value: string | null | undefined) {
  const normalized = value?.replaceAll(",", "") ?? "";
  const match = normalized.match(/\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const multiplier = /\d+(?:\.\d+)?\s*k\b/i.test(normalized) ? 1000 : 1;

  return Math.round(Number(match[0]) * multiplier);
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
    .select("id,sender,subject,body,category")
    .eq("user_id", user.id)
    .in("category", ["buyer_inquiry", "supplier_quote"])
    .neq("status", "archived")
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
    .select("id,email_id")
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
  const existingExtractionByEmailId = new Map(
    ((existingExtractions ?? []) as ExistingExtractionRow[]).map((row) => [row.email_id, row.id])
  );
  const emailsToExtract = emailRows.slice(0, 10);
  const results = [];

  try {
    for (const email of emailsToExtract) {
      const details = await extractTradeDetails({
        subject: email.subject,
        body: email.body,
        sender: email.sender,
        category: email.category,
      });

      const extractionRow = {
        product: details.product,
        quantity: details.quantity,
        price: details.price,
        incoterm: details.incoterm,
        origin_country: details.origin_country,
        destination_country: details.destination_country,
        delivery_date: details.delivery_date,
        payment_terms: details.payment_terms,
        missing_fields: details.missing_fields,
        risk_notes: details.risk_notes,
      };
      const existingExtractionId = existingExtractionByEmailId.get(email.id);
      const mutation = existingExtractionId
        ? supabase
          .from("extracted_trade_details")
          .update(extractionRow)
          .eq("id", existingExtractionId)
        : supabase.from("extracted_trade_details").insert({
          email_id: email.id,
          ...extractionRow,
        });

      const { error: insertError } = await mutation;

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

      if (email.category === "supplier_quote") {
        const { error: quoteError } = await supabase.from("supplier_quotes").upsert(
          {
            user_id: user.id,
            email_id: email.id,
            supplier_name: details.supplier_name ?? email.sender ?? null,
            product: details.product,
            unit_price: parseNumericValue(details.price),
            currency: details.currency ?? "USD",
            quantity: parseIntegerValue(details.quantity),
            moq: parseIntegerValue(details.moq),
            incoterm: details.incoterm,
            lead_time: details.lead_time ?? details.delivery_date,
            payment_terms: details.payment_terms,
            destination_country: details.destination_country,
            risk_notes: details.risk_notes.join("; ") || null,
          },
          { onConflict: "email_id" }
        );

        if (quoteError) {
          return jsonWithCookies(
            {
              error: "supplier_quote_upsert_failed",
              message: quoteError.message,
              extracted: results.length,
            },
            { status: 500 },
            cookieResponse
          );
        }
      }

      const reminder = email.category ? reminderMap[email.category] : null;

      if (reminder) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + reminder.days);

        const { error: reminderError } = await supabase.from("follow_ups").upsert(
          {
            user_id: user.id,
            email_id: email.id,
            reminder_type: reminder.type,
            note: reminder.note,
            due_date: dueDate.toISOString(),
            follow_up_date: dueDate.toISOString(),
            status: "pending",
          },
          { onConflict: "email_id" }
        );

        if (reminderError) {
          return jsonWithCookies(
            {
              error: "follow_up_upsert_failed",
              message: reminderError.message,
              extracted: results.length,
            },
            { status: 500 },
            cookieResponse
          );
        }
      }

      results.push({
        email_id: email.id,
        action: existingEmailIds.has(email.id) ? "updated" : "inserted",
        ...details,
      });
    }
  } catch (extractionError) {
    console.error("Unable to extract trade details.", extractionError);

    return jsonWithCookies(
      isAiConfigurationError(extractionError) ? aiConfigurationErrorBody() : aiProviderErrorBody(),
      { status: isAiConfigurationError(extractionError) ? 500 : 502 },
      cookieResponse
    );
  }

  return jsonWithCookies(
    {
      ok: true,
      extracted: results.length,
      results,
    },
    undefined,
    cookieResponse
  );
}
