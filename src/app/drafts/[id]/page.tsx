import Link from "next/link";
import { ArrowLeft, Check, Pencil, Send, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { aiDrafts, tradeEmails } from "@/lib/mock-data";

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = aiDrafts.find((item) => item.emailId === id || item.id === id) ?? aiDrafts[0];
  const email = tradeEmails.find((item) => item.id === draft.emailId) ?? tradeEmails[0];

  return (
    <AppShell>
      <div>
        <Link href="/drafts" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950">
          <ArrowLeft size={17} aria-hidden="true" />
          Drafts
        </Link>

        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Human approval</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Draft review</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              <Pencil size={17} aria-hidden="true" />
              Edit
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              <Check size={17} aria-hidden="true" />
              Save draft
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800">
              <Send size={17} aria-hidden="true" />
              Approve
            </button>
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5">
              <p className="text-sm text-zinc-500">To: {email.sender} · {email.company}</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-950">{draft.subject}</h2>
            </div>
            <div className="p-5">
              <div className="min-h-[390px] whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-800">
                {draft.body}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-950">
                <ShieldCheck size={18} aria-hidden="true" />
                Approval checks
              </div>
              <ul className="space-y-3 text-sm text-teal-950">
                {draft.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-zinc-950">Source email</p>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{email.subject}</p>
              <Link href={`/emails/${email.id}`} className="mt-4 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900">
                Open extraction
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
