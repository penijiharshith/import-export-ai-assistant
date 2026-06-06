import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SupplierComparison } from "@/components/supplier-comparison";

export default async function SupplierComparisonPage() {
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
    redirect("/login?next=/supplier-comparison");
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Procurement</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Supplier comparison</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Compare extracted supplier offers and review Groq-assisted buying recommendations.
        </p>
      </div>

      <SupplierComparison />
    </AppShell>
  );
}
