import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function jsonWithCookies(body: unknown, init: ResponseInit | undefined, cookieSource: NextResponse) {
  const response = NextResponse.json(body, init);

  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies({ error: "not_authenticated" }, { status: 401 }, cookieResponse);
  }

  const { data: draft, error: draftError } = await supabase
    .from("ai_drafts")
    .select("id,email_id,email_messages!inner(user_id)")
    .eq("id", id)
    .eq("email_messages.user_id", user.id)
    .maybeSingle();

  if (draftError || !draft) {
    return jsonWithCookies({ error: "draft_not_found" }, { status: 404 }, cookieResponse);
  }

  const { error: updateError } = await supabase
    .from("ai_drafts")
    .update({
      approved_by_user: true,
      status: "approved",
    })
    .eq("id", draft.id)
    .eq("email_id", draft.email_id);

  if (updateError) {
    console.error("Draft approval failed:", updateError);
    return jsonWithCookies({ error: "draft_approve_failed", message: "Unable to approve draft." }, { status: 500 }, cookieResponse);
  }

  return jsonWithCookies({ ok: true }, undefined, cookieResponse);
}
