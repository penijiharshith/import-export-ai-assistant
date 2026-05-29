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

export type EmailLoadResult = {
  emails: TradeEmail[];
  source: "supabase" | "mock";
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
      emails: tradeEmails,
      source: "mock",
      error: null,
    };
  }

  return {
    emails: data.map((row) => mapEmailMessageRow(row as EmailMessageRow)),
    source: "supabase",
    error: null,
  };
}
