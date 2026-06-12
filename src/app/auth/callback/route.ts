import { NextResponse, type NextRequest } from "next/server";
import { GMAIL_PROVIDER_TOKEN_COOKIE } from "@/lib/gmail";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const OAUTH_CALLBACK_ERROR_PATH = "/login?error=oauth_callback_failed";

function getSafeNextPath(nextPath: string) {
  if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath;
  }

  return "/dashboard";
}

function getSafeAuthErrorDetails(error: unknown) {
  const candidate = error && typeof error === "object" ? error as { message?: unknown; code?: unknown } : {};

  return {
    message: typeof candidate.message === "string" ? candidate.message.slice(0, 180) : "OAuth code exchange failed.",
    code: typeof candidate.code === "string" ? candidate.code.slice(0, 80) : undefined,
  };
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

  const response = NextResponse.redirect(redirectUrl);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    if (error) {
      console.warn("oauth_callback_exchange_failed", getSafeAuthErrorDetails(error));
    }

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
