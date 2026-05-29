import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DraftReviewEditor } from "@/components/drafts/draft-review-editor";
import { getDraftDetailForCurrentUser } from "@/lib/drafts";

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { draft, sourceEmail, extraction, source, error } = await getDraftDetailForCurrentUser(id);
  const isMock = source !== "supabase";

  return (
    <AppShell>
      <div>
        <Link href="/drafts" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950">
          <ArrowLeft size={17} aria-hidden="true" />
          Drafts
        </Link>

        {isMock && error ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            Could not load Supabase draft, showing fallback. {error}
          </p>
        ) : null}

        {!isMock && error ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            Draft loaded from Supabase, but some related details could not load. {error}
          </p>
        ) : null}

        <DraftReviewEditor
          draft={draft}
          sourceEmail={sourceEmail}
          extraction={extraction}
          isPersisted={!isMock}
        />
      </div>
    </AppShell>
  );
}
