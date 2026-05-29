import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClassifyEmailsButton } from "@/components/emails/classify-emails-button";
import { EmailList } from "@/components/email-list";
import { getEmailMessagesForCurrentUser } from "@/lib/email-messages";

export default async function EmailsPage() {
  const { emails, source, error } = await getEmailMessagesForCurrentUser();

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
          <ClassifyEmailsButton />
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

      <EmailList emails={emails} fullView source={source} />
    </AppShell>
  );
}
