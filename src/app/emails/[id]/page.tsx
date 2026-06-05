import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, Lightbulb, Mail, TriangleAlert, WandSparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DraftNavigationLink } from "@/components/drafts/draft-navigation-link";
import { HSCodeSuggestion } from "@/components/emails/hs-code-suggestion";
import { LandedCostCalculator } from "@/components/emails/landed-cost-calculator";
import { MarketPriceEstimate } from "@/components/emails/market-price-estimate";
import { getEmailDetailForCurrentUser } from "@/lib/email-messages";

function hasExtractedProduct(value: string) {
  const normalized = value.trim().toLowerCase();

  return Boolean(normalized && normalized !== "not provided" && normalized !== "not extracted yet");
}

function isMissingValue(value: string) {
  const normalized = value.trim().toLowerCase();

  return !normalized || normalized === "not provided" || normalized === "not extracted yet";
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replaceAll("_", " ");
}

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { email, extractionSource, draftId, actionSuggestion, error } = await getEmailDetailForCurrentUser(id);
  const urgencyTone: Record<string, string> = {
    high: "bg-rose-50 text-rose-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-slate-100 text-slate-600",
  };

  return (
    <AppShell>
      <Link href="/emails" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-all duration-150 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Inbox
      </Link>

      {error ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Could not load complete Supabase detail. {error}
        </p>
      ) : null}

      <header className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">{formatLabel(email.type)}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">{email.priority} priority</span>
          </div>
          <h1 className="mt-3 max-w-4xl text-2xl font-semibold text-slate-900 sm:text-3xl">{email.subject}</h1>
          <p className="mt-2 text-sm text-slate-500">From {email.sender} · {email.company} · {email.receivedAt}</p>
        </div>
        <Link href="/drafts" className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800">
          <WandSparkles className="size-4" aria-hidden="true" />
          Generate draft
        </Link>
      </header>

      <div className="space-y-5">
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="size-4 text-teal-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-900">Email body</h2>
          </div>
          <p className="whitespace-pre-line text-sm leading-7 text-slate-600">{email.body}</p>
        </section>

        <section className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="size-4 text-teal-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-900">AI recommended action</h2>
          </div>
          {actionSuggestion ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">{actionSuggestion.roleContext}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${urgencyTone[actionSuggestion.urgency] ?? urgencyTone.medium}`}>
                  {actionSuggestion.urgency} urgency
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {actionSuggestion.suggestedReplyType.replaceAll("_", " ")}
                </span>
              </div>
              <p className="leading-6 text-slate-600">{actionSuggestion.summary}</p>
              <div className="rounded-lg bg-teal-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Recommended next step</p>
                <p className="mt-2 font-semibold leading-6 text-teal-950">{actionSuggestion.recommendedAction}</p>
                <p className="mt-2 text-sm leading-6 text-teal-800">{actionSuggestion.businessGoal}</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <InfoList title="Missing info" items={actionSuggestion.missingInfo} emptyText="No critical gaps found." tone="amber" />
                <InfoList title="Risks" items={actionSuggestion.risks} emptyText="No major risk flagged." tone="rose" />
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">No AI action suggestion generated yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Bot className="size-4 text-teal-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-900">Extracted trade details</h2>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              {extractionSource === "supabase" ? "Supabase" : "Mock fallback"}
            </span>
          </div>
          {extractionSource === "supabase" ? (
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(email.extracted).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <dt className="text-xs font-medium capitalize text-slate-400">{formatLabel(key)}</dt>
                  <dd className={`mt-1 text-sm font-semibold ${isMissingValue(value) ? "text-amber-700" : "text-slate-900"}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm leading-6 text-slate-500">No extracted details yet. Run extraction from the emails page after classification.</p>
          )}

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <InfoList title="Missing details" items={email.missing} emptyText="No missing details." tone="amber" icon={<TriangleAlert className="size-4" aria-hidden="true" />} />
            <InfoList title="Risk notes" items={email.risks} emptyText="No risk notes." tone="rose" icon={<CheckCircle2 className="size-4" aria-hidden="true" />} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">AI tools</h2>
            <p className="mt-1 text-sm text-slate-500">Run focused trade checks using the extracted email details.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {email.type === "buyer_inquiry" && extractionSource === "supabase" ? <MarketPriceEstimate emailId={email.id} /> : null}
            {extractionSource === "supabase" && hasExtractedProduct(email.extracted.product) ? <HSCodeSuggestion emailId={email.id} /> : null}
            {extractionSource === "supabase"
              && hasExtractedProduct(email.extracted.targetPrice)
              && hasExtractedProduct(email.extracted.incoterm) ? <LandedCostCalculator emailId={email.id} /> : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Drafts</h2>
          <p className="mt-1 text-sm text-slate-500">Review the prepared response before anything is sent.</p>
          <div className="mt-4 max-w-xs">
            <DraftNavigationLink draftId={draftId} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function InfoList({
  title,
  items,
  emptyText,
  tone,
  icon,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: "amber" | "rose";
  icon?: React.ReactNode;
}) {
  const toneClasses = tone === "amber"
    ? "border-amber-100 bg-amber-50/60 text-amber-900"
    : "border-rose-100 bg-rose-50/60 text-rose-900";

  return (
    <div className={`rounded-lg border p-3 ${toneClasses}`}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
        {icon}
        {title}
      </p>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-sm leading-6">
          {items.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm">{emptyText}</p>
      )}
    </div>
  );
}
