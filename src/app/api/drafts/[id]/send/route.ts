import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GMAIL_PROVIDER_TOKEN_COOKIE } from "@/lib/gmail";
import { sendGmailReply } from "@/lib/gmail-send";

type DraftSendRow = {
  id: string;
  email_id: string;
  subject: string | null;
  body: string | null;
  status: string | null;
  approved_by_user: boolean | null;
  email_messages?:
    | {
        user_id: string;
        sender: string | null;
        gmail_message_id: string | null;
      }
    | Array<{
        user_id: string;
        sender: string | null;
        gmail_message_id: string | null;
      }>
    | null;
};

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function getSourceEmail(row: DraftSendRow) {
  return Array.isArray(row.email_messages) ? row.email_messages[0] : row.email_messages;
}

function draftBodyWithoutMetadata(body: string) {
  return body.split("\n\n---\nMissing questions:")[0];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
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
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (sessionError || userError || !session || !user) {
    return jsonWithCookies({ error: "not_authenticated" }, { status: 401 }, cookieResponse);
  }

  const providerToken = session.provider_token ?? request.cookies.get(GMAIL_PROVIDER_TOKEN_COOKIE)?.value;

  if (!providerToken) {
    return jsonWithCookies({ error: "gmail_not_connected" }, { status: 403 }, cookieResponse);
  }

  const { data: draftData, error: draftError } = await supabase
    .from("ai_drafts")
    .select("id,email_id,subject,body,status,approved_by_user,email_messages!inner(user_id,sender,gmail_message_id)")
    .eq("id", id)
    .eq("email_messages.user_id", user.id)
    .maybeSingle();

  if (draftError || !draftData) {
    return jsonWithCookies({ error: "draft_not_found" }, { status: 404 }, cookieResponse);
  }

  const draft = draftData as unknown as DraftSendRow;
  const sourceEmail = getSourceEmail(draft);

  if (draft.status === "sent") {
    return jsonWithCookies({ error: "draft_already_sent" }, { status: 409 }, cookieResponse);
  }

  if (draft.status !== "approved" || draft.approved_by_user !== true) {
    return jsonWithCookies({ error: "draft_not_approved" }, { status: 403 }, cookieResponse);
  }

  if (!sourceEmail?.sender || !draft.subject || !draft.body) {
    return jsonWithCookies({ error: "missing_send_fields" }, { status: 400 }, cookieResponse);
  }

  const approvedBody = draftBodyWithoutMetadata(draft.body).trim();

  if (!approvedBody) {
    return jsonWithCookies({ error: "missing_send_fields" }, { status: 400 }, cookieResponse);
  }

  try {
    const sendResult = await sendGmailReply({
      accessToken: providerToken,
      to: sourceEmail.sender,
      subject: draft.subject,
      body: approvedBody,
      originalMessageId: sourceEmail.gmail_message_id,
    });

    const { error: draftUpdateError } = await supabase
      .from("ai_drafts")
      .update({
        status: "sent",
      })
      .eq("id", draft.id)
      .eq("email_id", draft.email_id);

    if (draftUpdateError) {
      throw draftUpdateError;
    }

    const { error: emailUpdateError } = await supabase
      .from("email_messages")
      .update({
        status: "replied",
      })
      .eq("id", draft.email_id)
      .eq("user_id", user.id);

    if (emailUpdateError) {
      throw emailUpdateError;
    }

    return jsonWithCookies({ ok: true, gmail_message_id: sendResult.id }, undefined, cookieResponse);
  } catch (error) {
    console.error("Gmail draft send failed:", error);
    return jsonWithCookies({ error: "gmail_send_failed", message: "Unable to send Gmail reply." }, { status: 502 }, cookieResponse);
  }
}
