import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ArchiveEmailButton } from "@/components/emails/archive-email-button";
import type { TradeEmail } from "@/lib/mock-data";

const categoryTone: Record<string, string> = {
  buyer_inquiry: "bg-blue-50 text-blue-800",
  supplier_quote: "bg-teal-50 text-teal-800",
  payment: "bg-amber-50 text-amber-900",
  shipment: "bg-violet-50 text-violet-800",
  shipment_update: "bg-violet-50 text-violet-800",
  complaint: "bg-rose-50 text-rose-800",
  other: "bg-zinc-100 text-zinc-700",
  unclassified: "bg-zinc-100 text-zinc-600",
};

function formatCategory(category: string) {
  return category.replaceAll("_", " ");
}

export function EmailList({
  emails,
  fullView = false,
  source = "mock",
  showArchiveActions = false,
}: {
  emails: TradeEmail[];
  fullView?: boolean;
  source?: "supabase" | "mock";
  showArchiveActions?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-950">{fullView ? "Full inbox" : "Latest emails"}</h2>
        <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
          {source === "supabase" ? "Supabase" : "Mock fallback"}
        </span>
      </div>

      <div className="divide-y divide-zinc-200">
        {emails.map((email) => (
          <article
            key={email.id}
            className="grid gap-3 px-4 py-4 transition hover:bg-zinc-50 md:grid-cols-[1fr_auto] md:items-center"
          >
            <Link
              href={`/emails/${email.id}`}
              className="grid gap-4 md:grid-cols-[1fr_150px_130px_32px] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-950">{email.subject}</p>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      categoryTone[email.type] ?? categoryTone.other
                    }`}
                  >
                    {formatCategory(email.type)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {email.sender} · {email.company}
                </p>
                {fullView ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">{email.body}</p> : null}
              </div>
              <p className="text-sm text-zinc-500">{email.receivedAt}</p>
              <p className="text-sm font-medium text-teal-700">{email.status}</p>
              <ArrowRight className="hidden text-zinc-400 md:block" size={18} aria-hidden="true" />
            </Link>
            {showArchiveActions && source === "supabase" ? (
              <div className="md:justify-self-end">
                <ArchiveEmailButton emailId={email.id} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
