import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ArchiveEmailButton } from "@/components/emails/archive-email-button";
import type { TradeEmail } from "@/lib/mock-data";

const categoryTone: Record<string, string> = {
  buyer_inquiry: "bg-teal-50 text-teal-700",
  supplier_quote: "bg-blue-50 text-blue-700",
  payment: "bg-emerald-50 text-emerald-700",
  shipment: "bg-amber-50 text-amber-700",
  shipment_update: "bg-amber-50 text-amber-700",
  complaint: "bg-rose-50 text-rose-800",
  other: "bg-slate-100 text-slate-600",
  unclassified: "bg-slate-100 text-slate-500",
};

const categoryRail: Record<string, string> = {
  buyer_inquiry: "border-l-teal-500",
  supplier_quote: "border-l-blue-500",
  payment: "border-l-emerald-500",
  shipment: "border-l-amber-500",
  shipment_update: "border-l-amber-500",
  complaint: "border-l-rose-500",
  other: "border-l-slate-300",
  unclassified: "border-l-slate-300",
};

const statusTone: Record<string, string> = {
  new: "bg-teal-50 text-teal-700",
  replied: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
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
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{fullView ? "Trade messages" : "Latest emails"}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          {source === "supabase" ? "Supabase" : "Mock fallback"}
        </span>
      </div>

      <div className="grid gap-3">
        {emails.map((email) => (
          <article
            key={email.id}
            className={`group grid gap-3 rounded-xl border border-slate-100 border-l-4 bg-white p-4 shadow-sm transition-all duration-150 hover:shadow-md md:grid-cols-[1fr_auto] md:items-center ${categoryRail[email.type] ?? categoryRail.other}`}
          >
            <Link
              href={`/emails/${email.id}`}
              className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_145px_90px_24px] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      categoryTone[email.type] ?? categoryTone.other
                    }`}
                  >
                    {formatCategory(email.type)}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">{email.subject}</p>
                <p className="mt-1 text-xs text-slate-400">{email.sender} · {email.company}</p>
                {fullView ? <p className="mt-2 line-clamp-1 text-sm text-slate-500">{email.body}</p> : null}
              </div>
              <p className="text-xs text-slate-400">{email.receivedAt}</p>
              <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusTone[email.status] ?? statusTone.new}`}>{email.status}</span>
              <ArrowRight className="hidden size-4 text-slate-300 md:block" aria-hidden="true" />
            </Link>
            {showArchiveActions && source === "supabase" ? (
              <div className="opacity-100 transition-opacity duration-150 md:justify-self-end md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <ArchiveEmailButton emailId={email.id} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
