import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmailList } from "@/components/email-list";
import { stats, tradeEmails } from "@/lib/mock-data";

const statTone: Record<string, string> = {
  teal: "border-teal-200 bg-teal-50 text-teal-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
};

export default function DashboardPage() {
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-lg border p-4 shadow-sm ${statTone[stat.tone]}`}>
            <p className="text-sm font-medium">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <EmailList emails={tradeEmails} />
      </div>
    </AppShell>
  );
}
