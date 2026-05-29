import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClassifyEmailsButton } from "@/components/emails/classify-emails-button";
import { ExtractTradeDetailsButton } from "@/components/emails/extract-trade-details-button";
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

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Inbox</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Emails</h1>
          <p className="mt-2 text-sm text-zinc-500">Review buyer inquiries, supplier quotes, shipment updates, and payment messages.</p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-500 shadow-sm sm:w-80">
            <Search size={17} aria-hidden="true" />
            Search inbox
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ClassifyEmailsButton />
            <ExtractTradeDetailsButton />
          </div>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Could not load Supabase emails, showing mock fallback. {error}
        </p>
      ) : null}

      {source === "mock" && !error ? (
        <p className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
          No synced Gmail emails found yet. Showing mock fallback.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const isActive = tab.value === selectedFilter;

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                isActive
                  ? "border-teal-200 bg-teal-50 text-teal-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        Removed emails are hidden from this app only. Gmail is not affected.
      </p>

      {source === "supabase" && emails.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">No synced emails</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Connect Gmail in settings, then fetch your latest inbox messages.
          </p>
        </div>
      ) : source === "supabase" && visibleEmails.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">No emails in this view</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Try another filter tab or sync more Gmail messages.
          </p>
        </div>
      ) : (
        <EmailList emails={visibleEmails} fullView source={source} showArchiveActions />
      )}
    </AppShell>
  );
}
