import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { TradeEmail } from "@/lib/mock-data";
import { tradeEmails } from "@/lib/mock-data";

type EmailMessageRow = {
  id: string;
  gmail_message_id: string | null;
  sender: string | null;
  subject: string | null;
  body: string | null;
  category: string | null;
  status: string | null;
  received_at: string | null;
};

type ExtractedTradeDetailsRow = {
  product: string | null;
  quantity: string | null;
  price: string | null;
  incoterm: string | null;
  origin_country: string | null;
  destination_country: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  missing_fields: string[] | null;
  risk_notes: string[] | null;
};

export type EmailLoadResult = {
  emails: TradeEmail[];
  source: "supabase" | "mock";
  error: string | null;
};

export type EmailDetailLoadResult = {
  email: TradeEmail;
  source: "supabase" | "mock";
  extractionSource: "supabase" | "mock";
  draftId: string | null;
  error: string | null;
};

function formatReceivedAt(receivedAt: string | null) {
  if (!receivedAt) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(receivedAt));
}

function mapEmailMessageRow(row: EmailMessageRow): TradeEmail {
  return {
    id: row.id,
    sender: row.sender ?? "Unknown sender",
    company: "Gmail",
    subject: row.subject ?? "(No subject)",
    receivedAt: formatReceivedAt(row.received_at),
    type: row.category ?? "unclassified",
    priority: "Medium",
    status: row.status ?? "new",
    body: row.body ?? "",
    extracted: {
      product: "Not extracted yet",
      quantity: "Not extracted yet",
      incoterm: "Not extracted yet",
      destination: "Not extracted yet",
      targetPrice: "Not extracted yet",
      paymentTerms: "Not extracted yet",
    },
    missing: [],
    risks: [],
  };
}

function mapEmailMessageRowWithExtraction(
  row: EmailMessageRow,
  extraction: ExtractedTradeDetailsRow | null
): TradeEmail {
  const email = mapEmailMessageRow(row);

  if (!extraction) {
    return email;
  }

  return {
    ...email,
    extracted: {
      product: extraction.product ?? "Not provided",
      quantity: extraction.quantity ?? "Not provided",
      incoterm: extraction.incoterm ?? "Not provided",
      destination: extraction.destination_country ?? "Not provided",
      targetPrice: extraction.price ?? "Not provided",
      paymentTerms: extraction.payment_terms ?? "Not provided",
    },
    missing: extraction.missing_fields ?? [],
    risks: extraction.risk_notes ?? [],
  };
}

export function isEmailRouteUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getEmailMessagesForCurrentUser(): Promise<EmailLoadResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      emails: tradeEmails,
      source: "mock",
      error: "Supabase is not configured.",
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server components cannot write refreshed auth cookies.
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      emails: tradeEmails,
      source: "mock",
      error: userError?.message ?? "User is not authenticated.",
    };
  }

  const { data, error } = await supabase
    .from("email_messages")
    .select("id,gmail_message_id,sender,subject,body,category,status,received_at")
    .eq("user_id", user.id)
    .order("received_at", { ascending: false });

  if (error) {
    return {
      emails: tradeEmails,
      source: "mock",
      error: error.message,
    };
  }

  if (!data?.length) {
    return {
      emails: [],
      source: "supabase",
      error: null,
    };
  }

  return {
    emails: data.map((row) => mapEmailMessageRow(row as EmailMessageRow)),
    source: "supabase",
    error: null,
  };
}

export async function getEmailDetailForCurrentUser(emailId: string): Promise<EmailDetailLoadResult> {
  const mockEmail = tradeEmails.find((email) => email.id === emailId) ?? tradeEmails[0];

  if (!isEmailRouteUuid(emailId)) {
    return {
      email: mockEmail,
      source: "mock",
      extractionSource: "mock",
      draftId: null,
      error: null,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      email: mockEmail,
      source: "mock",
      extractionSource: "mock",
      draftId: null,
      error: "Supabase is not configured.",
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server components cannot write refreshed auth cookies.
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      email: mockEmail,
      source: "mock",
      extractionSource: "mock",
      draftId: null,
      error: userError?.message ?? "User is not authenticated.",
    };
  }

  const { data: emailRow, error: emailError } = await supabase
    .from("email_messages")
    .select("id,gmail_message_id,sender,subject,body,category,status,received_at")
    .eq("id", emailId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (emailError || !emailRow) {
    return {
      email: mockEmail,
      source: "mock",
      extractionSource: "mock",
      draftId: null,
      error: emailError?.message ?? null,
    };
  }

  const { data: draftRow, error: draftError } = await supabase
    .from("ai_drafts")
    .select("id")
    .eq("email_id", emailId)
    .maybeSingle();

  const { data: extractionRow, error: extractionError } = await supabase
    .from("extracted_trade_details")
    .select("product,quantity,price,incoterm,origin_country,destination_country,delivery_date,payment_terms,missing_fields,risk_notes")
    .eq("email_id", emailId)
    .maybeSingle();

  if (extractionError) {
    return {
      email: mapEmailMessageRow(emailRow as EmailMessageRow),
      source: "supabase",
      extractionSource: "mock",
      draftId: (draftRow as { id?: string } | null)?.id ?? null,
      error: extractionError.message,
    };
  }

  return {
    email: mapEmailMessageRowWithExtraction(
      emailRow as EmailMessageRow,
      extractionRow as ExtractedTradeDetailsRow | null
    ),
    source: "supabase",
    extractionSource: extractionRow ? "supabase" : "mock",
    draftId: draftError ? null : ((draftRow as { id?: string } | null)?.id ?? null),
    error: draftError?.message ?? null,
  };
}
