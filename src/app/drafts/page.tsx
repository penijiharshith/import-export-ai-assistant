import Link from "next/link";
import { ArrowRight, FileText, MailCheck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DraftCardLink } from "@/components/drafts/draft-card-link";
import { GenerateDraftsButton } from "@/components/drafts/generate-drafts-button";
import { getDraftsForCurrentUser } from "@/lib/drafts";

type DraftFilter = "all" | "pending" | "approved" | "sent" | "needs_revision";

const draftTabs: Array<{ label: string; value: DraftFilter; href: string }> = [
  { label: "All", value: "all", href: "/drafts" },
  { label: "Pending", value: "pending", href: "/drafts?status=pending" },
  { label: "Approved", value: "approved", href: "/drafts?status=approved" },
  { label: "Sent", value: "sent", href: "/drafts?status=sent" },
  { label: "Needs Revision", value: "needs_revision", href: "/drafts?status=needs_revision" },
];

const statusTone: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  needs_revision: "bg-rose-50 text-rose-700",
  sent: "bg-teal-50 text-teal-700",
};

function formatStatus(status: string) {
  return status === "needs_revision" ? "needs revision" : status;
}

export default async function DraftsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const selectedFilter: DraftFilter = draftTabs.some((tab) => tab.value === params?.status) ? params?.status as DraftFilter : "all";
  const { drafts, source, error } = await getDraftsForCurrentUser();
  const visibleDrafts = selectedFilter === "all" ? drafts : drafts.filter((draft) => draft.status === selectedFilter);
  const hasApprovedDrafts = drafts.some((draft) => draft.status === "approved" || draft.status === "sent");
  const counts = Object.fromEntries(draftTabs.map((tab) => [
    tab.value,
    tab.value === "all" ? drafts.length : drafts.filter((draft) => draft.status === tab.value).length,
  ]));

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Human approval</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Drafts</h1>
          <p className="mt-2 text-sm text-slate-500">Review AI-prepared replies before anything is sent.</p>
        </div>
        <GenerateDraftsButton />
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Could not load Supabase drafts, showing mock fallback. {error}
        </p>
      ) : null}

      {source === "supabase" && drafts.length > 0 && !hasApprovedDrafts ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          No approved drafts yet. Review a draft and approve it before Gmail sending becomes available.
        </p>
      ) : null}

      <div className="mb-5 flex gap-5 overflow-x-auto border-b border-slate-200">
        {draftTabs.map((tab) => {
          const isActive = tab.value === selectedFilter;

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-all duration-150 ${
                isActive ? "border-teal-700 text-teal-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                {counts[tab.value]}
              </span>
            </Link>
          );
        })}
      </div>

      {visibleDrafts.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto size-8 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">No {selectedFilter === "all" ? "" : `${formatStatus(selectedFilter)} `}drafts</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {drafts.length === 0
              ? "Generate AI drafts after classifying emails and extracting trade details."
              : "Choose another status filter to continue reviewing drafts."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibleDrafts.map((draft) => {
            const draftCard = (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                    <MailCheck className="size-4 text-teal-700" aria-hidden="true" />
                    {draft.type}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone[draft.status] ?? statusTone.pending}`}>
                    {formatStatus(draft.status)}
                  </span>
                </div>

                <h2 className="mt-4 text-base font-semibold text-slate-900">{draft.subject}</h2>
                <p className="mt-2 text-xs text-slate-400">To {draft.to} · {draft.createdAt}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{draft.body}</p>

                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
                  {draft.checks.filter((check) => !check.toLowerCase().startsWith("warning")).length} safety checks
                  {draft.checks.some((check) => check.toLowerCase().startsWith("warning")) ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">Warning</span>
                  ) : null}
                </div>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                  {source === "supabase" ? "Review draft" : "Generate draft first"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </div>
              </>
            );

            if (source !== "supabase") {
              return <article key={draft.id} className="rounded-xl border border-slate-100 bg-white p-5 opacity-75 shadow-sm">{draftCard}</article>;
            }

            return <DraftCardLink key={draft.id} draftId={draft.id}>{draftCard}</DraftCardLink>;
          })}
        </div>
      )}
    </AppShell>
  );
}
