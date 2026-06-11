import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyEmail } from "@/lib/ai/classify-email";
import { aiConfigurationErrorBody, isAiConfigured } from "@/lib/ai/groq";

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

  if (!isAiConfigured()) {
    return jsonWithCookies(aiConfigurationErrorBody(), { status: 500 }, cookieResponse);
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
    console.error("Unable to fetch emails for classification.", emailError);
    return jsonWithCookies(
      { error: "email_fetch_failed", message: "Unable to fetch emails for classification." },
      { status: 500 },
      cookieResponse
    );
  }

  const emailRows = (emails ?? []) as EmailRow[];
  const results = [];

  try {
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
        console.error("Unable to update email classification.", updateError);
        return jsonWithCookies(
          {
            error: "classification_update_failed",
            message: "Unable to save email classification.",
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
  } catch (classificationError) {
    console.error("Unable to classify emails.", classificationError);
    return jsonWithCookies(
      {
        error: "classification_failed",
        message: "Unable to classify emails.",
        classified: results.length,
      },
      { status: 502 },
      cookieResponse
    );
  }

  return jsonWithCookies(
    {
      ok: true,
      classified: results.length,
      results,
    },
    undefined,
    cookieResponse
  );
}
