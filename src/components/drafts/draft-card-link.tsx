"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function DraftCardLink({
  draftId,
  children,
}: {
  draftId: string;
  children: ReactNode;
}) {
  const navigationTarget = `/drafts/${draftId}`;

  return (
    <Link
      href={navigationTarget}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/30"
    >
      {children}
    </Link>
  );
}
