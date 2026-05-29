import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, Mail, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DraftNavigationLink } from "@/components/drafts/draft-navigation-link";
import { getEmailDetailForCurrentUser } from "@/lib/email-messages";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { email, extractionSource, draftId, error } = await getEmailDetailForCurrentUser(id);

  return (
    <AppShell>
      <div>
        <Link href="/emails" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950">
          <ArrowLeft size={17} aria-hidden="true" />
          Emails
        </Link>

        {error ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            Could not load complete Supabase detail. {error}
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">{email.type}</span>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">{email.priority} priority</span>
              </div>
              <h1 className="text-2xl font-semibold text-zinc-950">{email.subject}</h1>
              <p className="mt-2 text-sm text-zinc-500">
                From {email.sender} at {email.company} · {email.receivedAt}
              </p>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Mail size={18} aria-hidden="true" />
                Email body
              </div>
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">
                {email.body}
              </p>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Bot size={18} aria-hidden="true" />
                AI extraction
                <span className="ml-auto rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                  {extractionSource === "supabase" ? "Supabase" : "Mock fallback"}
                </span>
              </div>
              {extractionSource === "supabase" ? (
                <dl className="space-y-3 text-sm">
                  {Object.entries(email.extracted).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[115px_1fr] gap-3">
                      <dt className="capitalize text-zinc-500">{key.replace(/([A-Z])/g, " $1")}</dt>
                      <dd className="font-medium text-zinc-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm leading-6 text-zinc-500">
                  No extracted details yet. Run extraction from the emails page after classification.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-950">
                <TriangleAlert size={18} aria-hidden="true" />
                Missing details
              </div>
              <ul className="space-y-2 text-sm text-amber-950">
                {email.missing.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <CheckCircle2 size={18} aria-hidden="true" />
                Risk notes
              </div>
              <ul className="space-y-2 text-sm text-zinc-600">
                {email.risks.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <DraftNavigationLink draftId={draftId} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
