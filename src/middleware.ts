import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutePrefixes = [
  "/dashboard",
  "/emails",
  "/drafts",
  "/settings",
  "/supplier-comparison",
  "/follow-ups",
];
const authRoutePrefixes = ["/login"];

function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthRoute(pathname: string) {
  return authRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    redirectUrl.searchParams.set(key, value);
  });

  const redirectResponse = NextResponse.redirect(redirectUrl);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "missing-supabase-config");
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute(pathname)) {
    return redirectWithCookies(request, response, "/login", { next: pathname });
  }

  if (user && isAuthRoute(pathname)) {
    return redirectWithCookies(request, response, "/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/emails/:path*",
    "/drafts/:path*",
    "/settings/:path*",
    "/supplier-comparison/:path*",
    "/follow-ups/:path*",
  ],
};
