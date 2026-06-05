import Link from "next/link";
import { Inbox, Info, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClassifyEmailsButton } from "@/components/emails/classify-emails-button";
import { ExtractTradeDetailsButton } from "@/components/emails/extract-trade-details-button";
import { SuggestNextActionsButton } from "@/components/emails/suggest-next-actions-button";
import { EmailList } from "@/components/email-list";
import { getEmailMessagesForCurrentUser, HIDDEN_EMAIL_CATEGORIES, TRADE_EMAIL_CATEGORIES } from "@/lib/email-messages";

type EmailFilter = "trade" | "all" | "hidden";

const filterTabs: Array<{ label: string; value: EmailFilter; href: string }> = [
  { label: "Trade emails", value: "trade", href: "/emails" },
  { label: "All emails", value: "all", href: "/emails?filter=all" },
  { label: "Other/Hidden", value: "hidden", href: "/emails?filter=hidden" },
];
const tradeCategorySet = new Set<string>(TRADE_EMAIL_CATEGORIES);
const hiddenCategorySet = new Set<string>(HIDDEN_EMAIL_CATEGORIES);

function normalizeCategory(category: string) {
  return category.toLowerCase().replaceAll(" ", "_");
}

function filterEmails(emails: Awaited<ReturnType<typeof getEmailMessagesForCurrentUser>>["emails"], filter: EmailFilter) {
  if (filter === "all") {
    return emails;
  }

  if (filter === "hidden") {
    return emails.filter((email) => hiddenCategorySet.has(normalizeCategory(email.type)));
  }

  return emails.filter((email) => tradeCategorySet.has(normalizeCategory(email.type)));
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const selectedFilter: EmailFilter = params?.filter === "all" || params?.filter === "hidden" ? params.filter : "trade";
  const { emails, source, error } = await getEmailMessagesForCurrentUser();
  const visibleEmails = source === "supabase" ? filterEmails(emails, selectedFilter) : emails;
  const tabCounts = {
    trade: filterEmails(emails, "trade").length,
    all: emails.length,
    hidden: filterEmails(emails, "hidden").length,
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Trade workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Inbox</h1>
          <p className="mt-2 text-sm text-slate-500">Review buyer inquiries, supplier quotes, shipment updates, and payment messages.</p>
        </div>
        <div className="flex flex-col gap-3 xl:items-end">
          <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400 shadow-sm sm:w-80">
            <Search className="size-4" aria-hidden="true" />
            Search inbox
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <ClassifyEmailsButton />
            <ExtractTradeDetailsButton />
            <SuggestNextActionsButton />
          </div>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Could not load Supabase emails, showing mock fallback. {error}
        </p>
      ) : null}

      {source === "mock" && !error ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 shadow-sm">
          No synced Gmail emails found yet. Showing mock fallback.
        </p>
      ) : null}

      <div className="mb-4 flex gap-5 overflow-x-auto border-b border-slate-200">
        {filterTabs.map((tab) => {
          const isActive = tab.value === selectedFilter;

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "border-teal-700 text-teal-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                {tabCounts[tab.value]}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mb-4 flex items-center gap-2 text-xs text-slate-400">
        <Info className="size-3.5" aria-hidden="true" />
        Removed emails are hidden from this app only. Gmail is not affected.
      </p>

      {source === "supabase" && emails.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <Inbox className="mx-auto size-8 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">No synced emails</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Connect Gmail in settings, then fetch your latest inbox messages.
          </p>
          <Link href="/settings" className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800">
            Connect Gmail
          </Link>
        </div>
      ) : source === "supabase" && visibleEmails.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <Inbox className="mx-auto size-8 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">No emails in this view</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Try another filter tab or sync more Gmail messages.
          </p>
        </div>
      ) : (
        <EmailList emails={visibleEmails} fullView source={source} showArchiveActions />
      )}
    </AppShell>
  );
}
