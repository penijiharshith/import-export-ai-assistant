import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { AiDraft } from "@/lib/mock-data";
import { aiDrafts, tradeEmails } from "@/lib/mock-data";

type DraftRow = {
  id: string;
  email_id: string;
  draft_type: string | null;
  subject: string | null;
  body: string | null;
  status: string | null;
  approved_by_user: boolean | null;
  created_at: string | null;
  email_messages?:
    | {
        sender: string | null;
        subject: string | null;
        body?: string | null;
        category?: string | null;
      }
    | Array<{
        sender: string | null;
        subject: string | null;
        body?: string | null;
        category?: string | null;
      }>
    | null;
};

export type SourceEmailSummary = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  category: string;
};

export type DraftExtractionDetails = {
  product: string | null;
  quantity: string | null;
  price: string | null;
  incoterm: string | null;
  origin_country: string | null;
  destination_country: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  missing_fields: string[];
  risk_notes: string[];
};

export type DraftLoadResult = {
  drafts: AiDraft[];
  source: "supabase" | "mock";
  error: string | null;
};

export type DraftDetailLoadResult = {
  draft: AiDraft;
  sourceEmail: SourceEmailSummary;
  extraction: DraftExtractionDetails | null;
  userEmail: string;
  source: "supabase" | "mock";
  error: string | null;
};

function formatCreatedAt(createdAt: string | null) {
  if (!createdAt) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function titleCaseDraftType(type: string | null) {
  if (!type) {
    return "Reply";
  }

  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") as AiDraft["type"];
}

function formatStatus(status: string | null, approvedByUser: boolean | null): AiDraft["status"] {
  if (status === "sent") {
    return "sent";
  }

  if (approvedByUser) {
    return "approved";
  }

  if (status === "needs_revision") {
    return "needs_revision";
  }

  return "pending";
}

function safetyChecksFromBody(body: string | null) {
  const text = body ?? "";
  const safetyIndex = text.indexOf("Safety checks:");

  if (safetyIndex === -1) {
    return ["Human approval required"];
  }

  return text
    .slice(safetyIndex)
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.replace("- ", "").trim())
    .filter(Boolean);
}

function draftBodyWithoutMetadata(body: string | null) {
  return (body ?? "").split("\n\n---\nMissing questions:")[0];
}

function getSourceEmail(row: DraftRow) {
  return Array.isArray(row.email_messages) ? row.email_messages[0] : row.email_messages;
}

export function isDraftRouteUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapDraftRow(row: DraftRow): AiDraft {
  const sourceEmail = getSourceEmail(row);

  return {
    id: row.id,
    emailId: row.email_id,
    type: titleCaseDraftType(row.draft_type),
    to: sourceEmail?.sender ?? "Recipient",
    subject: row.subject ?? "Draft reply",
    body: draftBodyWithoutMetadata(row.body),
    status: formatStatus(row.status, row.approved_by_user),
    createdAt: formatCreatedAt(row.created_at),
    checks: safetyChecksFromBody(row.body),
  };
}

function mockDraftDetail(id: string, fallbackReason: string | null = null, userEmail = "your@email.com"): DraftDetailLoadResult {
  const draft = aiDrafts.find((item) => item.emailId === id || item.id === id) ?? aiDrafts[0];
  const sourceEmail = tradeEmails.find((item) => item.id === draft.emailId) ?? tradeEmails[0];

  return {
    draft,
    sourceEmail: {
      id: sourceEmail.id,
      sender: sourceEmail.sender,
      subject: sourceEmail.subject,
      body: sourceEmail.body,
      category: sourceEmail.type,
    },
    extraction: {
      product: sourceEmail.extracted.product,
      quantity: sourceEmail.extracted.quantity,
      price: sourceEmail.extracted.targetPrice,
      incoterm: sourceEmail.extracted.incoterm,
      origin_country: null,
      destination_country: sourceEmail.extracted.destination,
      delivery_date: null,
      payment_terms: sourceEmail.extracted.paymentTerms,
      missing_fields: sourceEmail.missing,
      risk_notes: sourceEmail.risks,
    },
    userEmail,
    source: "mock",
    error: fallbackReason,
  };
}

async function createDraftSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server components cannot write refreshed auth cookies.
      },
    },
  });
}

export async function getDraftsForCurrentUser(): Promise<DraftLoadResult> {
  const supabase = await createDraftSupabaseClient();

  if (!supabase) {
    return {
      drafts: aiDrafts,
      source: "mock",
      error: "Supabase is not configured.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      drafts: aiDrafts,
      source: "mock",
      error: userError?.message ?? "User is not authenticated.",
    };
  }

  const { data, error } = await supabase
    .from("ai_drafts")
    .select("id,email_id,draft_type,subject,body,status,approved_by_user,created_at,email_messages!inner(sender,subject,body,category,user_id)")
    .eq("email_messages.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      drafts: aiDrafts,
      source: "mock",
      error: error.message,
    };
  }

  if (!data?.length) {
    return {
      drafts: [],
      source: "supabase",
      error: null,
    };
  }

  return {
    drafts: (data as unknown as DraftRow[]).map(mapDraftRow),
    source: "supabase",
    error: null,
  };
}

export async function getDraftDetailForCurrentUser(id: string): Promise<DraftDetailLoadResult> {
  const idIsUuid = isDraftRouteUuid(id);

  if (!idIsUuid) {
    const fallbackReason = "Draft route id is not a UUID.";

    return mockDraftDetail(id, fallbackReason);
  }

  const supabase = await createDraftSupabaseClient();

  if (!supabase) {
    const fallbackReason = "Supabase is not configured.";

    return {
      ...mockDraftDetail(id, fallbackReason),
      error: fallbackReason,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const fallbackReason = userError?.message ?? "User is not authenticated.";

    return {
      ...mockDraftDetail(id, fallbackReason),
      error: fallbackReason,
    };
  }

  const { data, error } = await supabase
    .from("ai_drafts")
    .select("id,email_id,draft_type,subject,body,status,approved_by_user,created_at,email_messages!inner(sender,subject,body,category,user_id)")
    .eq("id", id)
    .eq("email_messages.user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    const fallbackReason = error?.message ?? "Supabase returned no matching ai_drafts row for this draft UUID.";

    return {
      ...mockDraftDetail(id, fallbackReason, user.email ?? "your@email.com"),
      error: fallbackReason,
    };
  }

  const draftRow = data as unknown as DraftRow;
  const draft = mapDraftRow(draftRow);
  const sourceEmail = getSourceEmail(draftRow);

  const { data: extractionRow, error: extractionError } = await supabase
    .from("extracted_trade_details")
    .select("product,quantity,price,incoterm,origin_country,destination_country,delivery_date,payment_terms,missing_fields,risk_notes")
    .eq("email_id", draft.emailId)
    .maybeSingle();

  return {
    draft,
    sourceEmail: {
      id: draft.emailId,
      sender: sourceEmail?.sender ?? "Unknown sender",
      subject: sourceEmail?.subject ?? "Source email",
      body: (sourceEmail as { body?: string | null } | undefined)?.body ?? "",
      category: (sourceEmail as { category?: string | null } | undefined)?.category ?? "unclassified",
    },
    extraction: extractionError || !extractionRow
      ? null
      : {
          product: extractionRow.product ?? null,
          quantity: extractionRow.quantity ?? null,
          price: extractionRow.price ?? null,
          incoterm: extractionRow.incoterm ?? null,
          origin_country: extractionRow.origin_country ?? null,
          destination_country: extractionRow.destination_country ?? null,
          delivery_date: extractionRow.delivery_date ?? null,
          payment_terms: extractionRow.payment_terms ?? null,
          missing_fields: (extractionRow.missing_fields as string[] | null) ?? [],
          risk_notes: (extractionRow.risk_notes as string[] | null) ?? [],
    },
    userEmail: user.email ?? "your@email.com",
    source: "supabase",
    error: extractionError?.message ?? null,
  };
}
