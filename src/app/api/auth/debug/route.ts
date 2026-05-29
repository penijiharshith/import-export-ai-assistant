import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getGoogleTokenScopes,
  GMAIL_PROVIDER_TOKEN_COOKIE,
  GMAIL_READONLY_SCOPE,
  GMAIL_SEND_SCOPE,
  type GmailPermissionDebug,
} from "@/lib/gmail";

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
  const providerTokenExists = Boolean(providerToken);
  let scopesGranted: string[] = [];
  let scopeCheckError: string | null = null;

  if (providerToken) {
    try {
      scopesGranted = await getGoogleTokenScopes(providerToken);
    } catch (error) {
      scopeCheckError = error instanceof Error ? error.message : "Unable to verify Google scopes.";
    }
  }

  const debug: GmailPermissionDebug & { scopeCheckError: string | null } = {
    providerTokenExists,
    gmailPermissionGranted: scopesGranted.includes(GMAIL_READONLY_SCOPE) && scopesGranted.includes(GMAIL_SEND_SCOPE),
    scopesGranted,
    scopeCheckError,
  };

  return jsonWithCookies(debug, undefined, cookieResponse);
}
