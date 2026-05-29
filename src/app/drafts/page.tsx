import Link from "next/link";
import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { aiDrafts, tradeEmails } from "@/lib/mock-data";

export default function DraftsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Human approval</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Drafts</h1>
        <p className="mt-2 text-sm text-zinc-500">Review AI-prepared replies before anything is sent.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {aiDrafts.map((draft) => {
          const sourceEmail = tradeEmails.find((email) => email.id === draft.emailId);

          return (
            <Link
              key={draft.id}
              href={`/drafts/${draft.emailId}`}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/30"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                  <MailCheck size={14} aria-hidden="true" />
                  {draft.type}
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">{draft.status}</span>
              </div>

              <h2 className="text-lg font-semibold text-zinc-950">{draft.subject}</h2>
              <p className="mt-2 text-sm text-zinc-500">
                To {draft.to} · {draft.createdAt}
              </p>
              {sourceEmail ? <p className="mt-3 text-sm leading-6 text-zinc-600">Source: {sourceEmail.subject}</p> : null}

              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-teal-700">
                <ShieldCheck size={16} aria-hidden="true" />
                {draft.checks.length} approval checks
              </div>

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950">
                Review draft
                <ArrowRight size={16} aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
