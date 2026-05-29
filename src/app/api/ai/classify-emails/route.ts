import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyEmail } from "@/lib/ai/classify-email";

type EmailRow = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
};

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

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "missing_groq_api_key" }, { status: 500 });
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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies({ error: "not_authenticated" }, { status: 401 }, cookieResponse);
  }

  const { data: emails, error: emailError } = await supabase
    .from("email_messages")
    .select("id,sender,subject,body")
    .eq("user_id", user.id)
    .eq("category", "unclassified")
    .neq("status", "archived")
    .order("received_at", { ascending: false })
    .limit(10);

  if (emailError) {
    return jsonWithCookies({ error: "email_fetch_failed", message: emailError.message }, { status: 500 }, cookieResponse);
  }

  const emailRows = (emails ?? []) as EmailRow[];
  const results = [];

  for (const email of emailRows) {
    const classification = await classifyEmail({
      subject: email.subject,
      body: email.body,
      sender: email.sender,
    });

    const { error: updateError } = await supabase
      .from("email_messages")
      .update({
        category: classification.category,
        status: "new",
      })
      .eq("id", email.id)
      .eq("user_id", user.id);

    if (updateError) {
      return jsonWithCookies(
        {
          error: "classification_update_failed",
          message: updateError.message,
          classified: results.length,
        },
        { status: 500 },
        cookieResponse
      );
    }

    results.push({
      email_id: email.id,
      ...classification,
    });
  }

  return jsonWithCookies(
    {
      classified: results.length,
      results,
    },
    undefined,
    cookieResponse
  );
}
