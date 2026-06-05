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
      className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-150 hover:border-teal-200 hover:shadow-md"
    >
      {children}
    </Link>
  );
}
