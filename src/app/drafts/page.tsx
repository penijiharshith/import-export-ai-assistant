import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DraftCardLink } from "@/components/drafts/draft-card-link";
import { GenerateDraftsButton } from "@/components/drafts/generate-drafts-button";
import { getDraftsForCurrentUser } from "@/lib/drafts";

const statusTone: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900",
  approved: "bg-teal-50 text-teal-800",
  needs_revision: "bg-rose-50 text-rose-800",
  sent: "bg-blue-50 text-blue-800",
};

function formatStatus(status: string) {
  return status === "needs_revision" ? "needs revision" : status;
}

export default async function DraftsPage() {
  const { drafts, source, error } = await getDraftsForCurrentUser();
  const hasApprovedDrafts = drafts.some((draft) => draft.status === "approved" || draft.status === "sent");

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Human approval</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Drafts</h1>
          <p className="mt-2 text-sm text-zinc-500">Review AI-prepared replies before anything is sent.</p>
        </div>
        <GenerateDraftsButton />
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Could not load Supabase drafts, showing mock fallback. {error}
        </p>
      ) : null}

      {source === "supabase" && drafts.length === 0 ? (
        <p className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
          No drafts yet. Generate AI drafts after classifying emails and extracting trade details.
        </p>
      ) : null}

      {source === "supabase" && drafts.length > 0 && !hasApprovedDrafts ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          No approved drafts yet. Review a draft and approve it before Gmail sending becomes available.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {drafts.map((draft) => {
          const draftCard = (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                  <MailCheck size={14} aria-hidden="true" />
                  {draft.type}
                </span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusTone[draft.status] ?? statusTone.pending}`}>
                  {formatStatus(draft.status)}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-zinc-950">{draft.subject}</h2>
              <p className="mt-2 text-sm text-zinc-500">
                To {draft.to} · {draft.createdAt}
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{draft.body}</p>

              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-teal-700">
                <ShieldCheck size={16} aria-hidden="true" />
                {draft.checks.filter((check) => !check.toLowerCase().startsWith("warning")).length} safety checks
              </div>

              {draft.checks.some((check) => check.toLowerCase().startsWith("warning")) ? (
                <p className="mt-2 text-sm font-medium text-rose-700">Safety warning present</p>
              ) : null}

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950">
                {source === "supabase" ? "Review draft" : "Generate draft first"}
                <ArrowRight size={16} aria-hidden="true" />
              </div>
            </>
          );

          if (source !== "supabase") {
            return (
              <article
                key={draft.id}
                className="rounded-lg border border-zinc-200 bg-white p-5 opacity-75 shadow-sm"
              >
                {draftCard}
              </article>
            );
          }

          return (
            <DraftCardLink
              key={draft.id}
              draftId={draft.id}
            >
              {draftCard}
            </DraftCardLink>
          );
        })}
      </div>
    </AppShell>
  );
}
