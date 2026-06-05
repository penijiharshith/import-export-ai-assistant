import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  CircleAlert,
  FileCheck2,
  FileSearch,
  Inbox,
  Mail,
  Search,
  Send,
  Tags,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getDashboardDataForCurrentUser } from "@/lib/dashboard";

const workflowSteps = [
  { label: "Sync", icon: Mail, state: "complete" },
  { label: "Classify", icon: Tags, state: "complete" },
  { label: "Extract", icon: FileSearch, state: "current" },
  { label: "Draft", icon: FileCheck2, state: "future" },
  { label: "Approve", icon: Check, state: "future" },
  { label: "Send", icon: Send, state: "future" },
] as const;

const statCards = [
  { label: "New trade emails", icon: Inbox, accent: "border-l-teal-500", tone: "text-teal-700 bg-teal-50" },
  { label: "Drafts ready", icon: FileCheck2, accent: "border-l-emerald-500", tone: "text-emerald-700 bg-emerald-50" },
  { label: "Follow-ups due", icon: Bell, accent: "border-l-amber-500", tone: "text-amber-700 bg-amber-50" },
  { label: "Missing info", icon: CircleAlert, accent: "border-l-rose-500", tone: "text-rose-700 bg-rose-50" },
];

function formatCategory(category: string) {
  return category.replaceAll("_", " ");
}

export default async function DashboardPage() {
  const { stats, emails, actionSuggestions, source, error } = await getDashboardDataForCurrentUser();
  const statsByLabel = new Map(stats.map((stat) => [stat.label.toLowerCase(), stat.value]));

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Trade operations</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Command center</h1>
          <p className="mt-2 text-sm text-slate-500">Monitor inbox activity, approvals, and the next trade actions.</p>
        </div>
        <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400 shadow-sm sm:w-80">
          <Search className="size-4" aria-hidden="true" />
          Search emails, buyers, suppliers
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Could not load Supabase dashboard data, showing demo fallback. {error}
        </p>
      ) : null}

      {source === "mock" && !error ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 shadow-sm">
          No Supabase emails found yet. Showing demo dashboard data.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Trade workflow</h2>
            <p className="mt-1 text-xs text-slate-400">Current email automation pipeline</p>
          </div>
          <span className="w-fit rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">Human approval required</span>
        </div>
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {workflowSteps.map((step, index) => (
            <div key={step.label} className="flex shrink-0 items-center gap-2">
              <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                step.state === "complete"
                  ? "bg-teal-700 text-white"
                  : step.state === "current"
                    ? "border border-teal-200 bg-teal-50 text-teal-800"
                    : "bg-slate-100 text-slate-400"
              }`}>
                <step.icon className="size-3.5" aria-hidden="true" />
                {step.label}
              </div>
              {index < workflowSteps.length - 1 ? <ArrowRight className="size-3.5 text-slate-300" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article key={stat.label} className={`rounded-xl border border-slate-100 border-l-4 bg-white p-4 shadow-sm ${stat.accent}`}>
            <div className={`grid size-9 place-items-center rounded-lg ${stat.tone}`}>
              <stat.icon className="size-4" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{statsByLabel.get(stat.label) ?? "0"}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{stat.label}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
              <p className="mt-1 text-xs text-slate-400">Latest trade emails in your workspace</p>
            </div>
            <Link href="/emails" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
              Open inbox
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          {emails.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="mx-auto size-7 text-slate-300" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-slate-900">No dashboard emails</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Connect Gmail and sync messages to populate analytics.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {emails.slice(0, 5).map((email) => (
                <Link key={email.id} href={`/emails/${email.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 transition-all duration-150 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{email.subject}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">{formatCategory(email.type)}</span>
                      <span className="text-xs text-slate-400">{email.receivedAt}</span>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-slate-300" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">AI recommended actions</h2>
            <p className="mt-1 text-xs text-slate-400">Priority work suggested from recent emails</p>
          </div>
          {actionSuggestions.length === 0 ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">No AI actions yet</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">Run Suggest next actions after classification.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {actionSuggestions.slice(0, 3).map((suggestion) => (
                <Link key={suggestion.id} href={`/emails/${suggestion.emailId}`} className="block rounded-lg border border-slate-100 p-3 transition-all duration-150 hover:border-teal-200 hover:bg-teal-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{suggestion.emailSubject}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      suggestion.urgency === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {suggestion.urgency}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{suggestion.recommendedAction}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
