import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

  if (!isUuid(id)) {
    return NextResponse.json({ error: "invalid_email_id" }, { status: 400 });
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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies({ error: "not_authenticated" }, { status: 401 }, cookieResponse);
  }

  const { data: emailRow, error: emailFetchError } = await supabase
    .from("email_messages")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (emailFetchError) {
    return jsonWithCookies({ error: "email_fetch_failed", message: emailFetchError.message }, { status: 500 }, cookieResponse);
  }

  if (!emailRow) {
    return jsonWithCookies({ error: "email_not_found" }, { status: 404 }, cookieResponse);
  }

  const { error } = await supabase
    .from("email_messages")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return jsonWithCookies({ error: "archive_failed", message: error.message }, { status: 500 }, cookieResponse);
  }

  return jsonWithCookies({ ok: true }, undefined, cookieResponse);
}
