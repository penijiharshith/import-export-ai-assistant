import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchLatestGmailMessages, GMAIL_PROVIDER_TOKEN_COOKIE } from "@/lib/gmail";

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

  try {
    const messages = await fetchLatestGmailMessages(providerToken, 10);

    const { error: profileError } = await supabase.from("users_profile").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    });

    if (profileError) {
      throw profileError;
    }

    if (messages.length === 0) {
      return jsonWithCookies(
        {
          messages,
          synced: 0,
          inserted: 0,
          updated: 0,
        },
        undefined,
        cookieResponse
      );
    }

    const gmailMessageIds = messages.map((message) => message.gmail_message_id);
    const { data: existingRows, error: existingError } = await supabase
      .from("email_messages")
      .select("id,gmail_message_id,status")
      .eq("user_id", user.id)
      .in("gmail_message_id", gmailMessageIds);

    if (existingError) {
      throw existingError;
    }

    const existingByGmailId = new Map(
      (existingRows ?? []).map((row) => [
        row.gmail_message_id as string,
        {
          id: row.id as string,
          status: row.status as string | null,
        },
      ])
    );

    const updates = messages
      .filter((message) => existingByGmailId.has(message.gmail_message_id))
      .map((message) =>
        supabase
          .from("email_messages")
          .update({
            sender: message.sender,
            subject: message.subject,
            body: message.snippet,
            category: "unclassified",
            status: existingByGmailId.get(message.gmail_message_id)?.status === "archived" ? "archived" : "new",
            received_at: message.received_at,
          })
          .eq("id", existingByGmailId.get(message.gmail_message_id)!.id)
          .eq("user_id", user.id)
      );

    const inserts = messages
      .filter((message) => !existingByGmailId.has(message.gmail_message_id))
      .map((message) => ({
        user_id: user.id,
        gmail_message_id: message.gmail_message_id,
        sender: message.sender,
        subject: message.subject,
        body: message.snippet,
        category: "unclassified",
        status: "new",
        received_at: message.received_at,
      }));

    const updateResults = await Promise.all(updates);
    const updateError = updateResults.find((result) => result.error)?.error;

    if (updateError) {
      throw updateError;
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("email_messages").insert(inserts);

      if (insertError) {
        throw insertError;
      }
    }

    return jsonWithCookies(
      {
        messages,
        synced: messages.length,
        inserted: inserts.length,
        updated: updates.length,
      },
      undefined,
      cookieResponse
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync Gmail messages.";

    return jsonWithCookies({ error: "gmail_sync_failed", message }, { status: 502 }, cookieResponse);
  }
}
