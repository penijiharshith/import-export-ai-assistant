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

export async function GET(request: NextRequest) {
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

  if (sessionError || !session) {
    return jsonWithCookies({ error: "not_authenticated" }, { status: 401 }, cookieResponse);
  }

  const providerToken = session.provider_token ?? request.cookies.get(GMAIL_PROVIDER_TOKEN_COOKIE)?.value;

  if (!providerToken) {
    return jsonWithCookies({ error: "gmail_not_connected" }, { status: 403 }, cookieResponse);
  }

  try {
    const messages = await fetchLatestGmailMessages(providerToken, 10);

    return jsonWithCookies({ messages }, undefined, cookieResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch Gmail messages.";

    return jsonWithCookies({ error: "gmail_fetch_failed", message }, { status: 502 }, cookieResponse);
  }
}
