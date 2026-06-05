import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FollowUpsList } from "@/components/follow-ups-list";

export default async function FollowUpsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/login?error=missing-supabase-config");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server components cannot write refreshed auth cookies.
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/follow-ups");
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Trade operations</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Follow-ups</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Keep buyer replies, supplier quotes, payments, and shipment checks moving.
        </p>
      </div>

      <FollowUpsList />
    </AppShell>
  );
}
