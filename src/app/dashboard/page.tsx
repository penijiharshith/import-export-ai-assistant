import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmailList } from "@/components/email-list";
import { getDashboardDataForCurrentUser } from "@/lib/dashboard";

const statTone: Record<string, string> = {
  teal: "border-teal-200 bg-teal-50 text-teal-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
};

export default async function DashboardPage() {
  const { stats, emails, source, error } = await getDashboardDataForCurrentUser();

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Trade inbox</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Dashboard</h1>
        </div>
        <div className="flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-500 shadow-sm sm:w-80">
          <Search size={17} aria-hidden="true" />
          Search emails, buyers, suppliers
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Could not load Supabase dashboard data, showing demo fallback. {error}
        </p>
      ) : null}

      {source === "mock" && !error ? (
        <p className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
          No Supabase emails found yet. Showing demo dashboard data.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-lg border p-4 shadow-sm ${statTone[stat.tone]}`}>
            <p className="text-sm font-medium">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {emails.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">No dashboard emails</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Connect Gmail and sync messages to populate analytics.
            </p>
          </div>
        ) : (
          <EmailList emails={emails} source={source} />
        )}
      </div>
    </AppShell>
  );
}
