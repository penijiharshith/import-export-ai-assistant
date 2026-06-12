import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GMAIL_PROVIDER_TOKEN_COOKIE } from "@/lib/gmail";

const OAUTH_CALLBACK_ERROR_PATH = "/login?error=oauth_callback_failed";

function getSafeNextPath(nextPath: string) {
  if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath;
  }

  return "/dashboard";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNextPath = getSafeNextPath(nextPath);
  const redirectUrl = new URL(safeNextPath, request.url);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL(OAUTH_CALLBACK_ERROR_PATH, request.url));
  }

  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(redirectUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(new URL(OAUTH_CALLBACK_ERROR_PATH, request.url));
  }

  const providerToken = data.session?.provider_token;

  if (providerToken) {
    response.cookies.set(GMAIL_PROVIDER_TOKEN_COOKIE, providerToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  return response;
}
