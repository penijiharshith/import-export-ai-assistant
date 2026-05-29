"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function DraftNavigationLink({ draftId }: { draftId: string | null }) {
  const navigationTarget = draftId ? `/drafts/${draftId}` : null;

  if (!navigationTarget) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
        Generate draft first
      </div>
    );
  }

  return (
    <Link
      href={navigationTarget}
      className="flex h-12 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
    >
      Review AI draft
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}
