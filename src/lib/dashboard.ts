import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { TradeEmail } from "@/lib/mock-data";
import { stats as mockStats, tradeEmails } from "@/lib/mock-data";

type DashboardEmailRow = {
  id: string;
  gmail_message_id: string | null;
  sender: string | null;
  subject: string | null;
  body: string | null;
  category: string | null;
  status: string | null;
  received_at: string | null;
};

type ExtractionMetricRow = {
  missing_fields: unknown;
  risk_notes: unknown;
};

export type DashboardStat = {
  label: string;
  value: string;
  tone: "teal" | "blue" | "amber" | "rose";
};

export type DashboardDataResult = {
  stats: DashboardStat[];
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

function mapEmailRow(row: DashboardEmailRow): TradeEmail {
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

function arrayHasItems(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function mockDashboard(error: string | null = null): DashboardDataResult {
  return {
    stats: mockStats as DashboardStat[],
    emails: tradeEmails,
    source: "mock",
    error,
  };
}

export async function getDashboardDataForCurrentUser(): Promise<DashboardDataResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return mockDashboard("Supabase is not configured.");
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
    return mockDashboard(userError?.message ?? "User is not authenticated.");
  }

  const { data: latestEmailRows, error: latestEmailError } = await supabase
    .from("email_messages")
    .select("id,gmail_message_id,sender,subject,body,category,status,received_at")
    .eq("user_id", user.id)
    .order("received_at", { ascending: false })
    .limit(6);

  if (latestEmailError) {
    return mockDashboard(latestEmailError.message);
  }

  if (!latestEmailRows?.length) {
    return mockDashboard(null);
  }

  const [
    newEmailsResult,
    approvedDraftsResult,
    extractionMetricsResult,
  ] = await Promise.all([
    supabase
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "new"),
    supabase
      .from("ai_drafts")
      .select("id,email_messages!inner(user_id)", { count: "exact", head: true })
      .eq("email_messages.user_id", user.id)
      .eq("status", "approved"),
    supabase
      .from("extracted_trade_details")
      .select("missing_fields,risk_notes,email_messages!inner(user_id)")
      .eq("email_messages.user_id", user.id),
  ]);

  const firstMetricError = newEmailsResult.error ?? approvedDraftsResult.error ?? extractionMetricsResult.error;

  if (firstMetricError) {
    return mockDashboard(firstMetricError.message);
  }

  const extractionRows = (extractionMetricsResult.data ?? []) as ExtractionMetricRow[];
  const missingInfoCount = extractionRows.filter((row) => arrayHasItems(row.missing_fields)).length;
  const highRiskCount = extractionRows.filter((row) => arrayHasItems(row.risk_notes)).length;

  return {
    stats: [
      { label: "New trade emails", value: String(newEmailsResult.count ?? 0), tone: "teal" },
      { label: "Drafts ready", value: String(approvedDraftsResult.count ?? 0), tone: "blue" },
      { label: "Missing info", value: String(missingInfoCount), tone: "amber" },
      { label: "High risk", value: String(highRiskCount), tone: "rose" },
    ],
    emails: (latestEmailRows as DashboardEmailRow[]).map(mapEmailRow),
    source: "supabase",
    error: null,
  };
}
