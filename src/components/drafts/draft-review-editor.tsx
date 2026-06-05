"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";
import { DownloadQuotationPDFButton } from "@/components/drafts/download-quotation-pdf-button";
import type { AiDraft } from "@/lib/mock-data";
import type { DraftExtractionDetails, SourceEmailSummary } from "@/lib/drafts";

const statusTone: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  needs_revision: "bg-rose-50 text-rose-700",
  sent: "bg-teal-50 text-teal-700",
};

function formatStatus(status: string) {
  if (status === "needs_revision") {
    return "needs revision";
  }

  return status;
}

function detailValue(value: string | null) {
  return value || "Not provided";
}

export function DraftReviewEditor({
  draft,
  sourceEmail,
  extraction,
  userEmail,
  isPersisted,
}: {
  draft: AiDraft;
  sourceEmail: SourceEmailSummary;
  extraction: DraftExtractionDetails | null;
  userEmail: string;
  isPersisted: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "revision" | "send" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function submitRequest(path: string, init: RequestInit, successMessage: string) {
    setError(null);
    setMessage(null);

    const response = await fetch(path, init);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? "Draft update failed.");
    }

    setMessage(successMessage);
    setToast({ type: "success", message: successMessage });
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSaveChanges() {
    setIsSaving(true);

    try {
      await submitRequest(
        `/api/drafts/${draft.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subject, body }),
        },
        "Draft changes saved."
      );
    } catch (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : "Unable to save draft changes.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApproveDraft() {
    setActionLoading("approve");

    try {
      await submitRequest(
        `/api/drafts/${draft.id}/approve`,
        {
          method: "POST",
        },
        "Draft approved. You can now send it manually."
      );
    } catch (approveError) {
      const errorMessage = approveError instanceof Error ? approveError.message : "Unable to approve draft.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleNeedsRevision() {
    setActionLoading("revision");

    try {
      await submitRequest(
        `/api/drafts/${draft.id}/needs-revision`,
        {
          method: "POST",
        },
        "Draft marked as needs revision."
      );
    } catch (revisionError) {
      const errorMessage = revisionError instanceof Error ? revisionError.message : "Unable to mark draft as needs revision.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSendDraft() {
    const confirmed = window.confirm("Are you sure you want to send this approved draft?");

    if (!confirmed) {
      return;
    }

    setActionLoading("send");

    try {
      await submitRequest(
        `/api/drafts/${draft.id}/send`,
        {
          method: "POST",
        },
        "Draft sent through Gmail."
      );
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : "Unable to send draft through Gmail.";
      setError(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(null);
    }
  }

  const isSent = draft.status === "sent";
  const canShowSend = draft.status === "approved" || isSent;
  const disabled = !isPersisted || isSaving || Boolean(actionLoading) || isPending || isSent;
  const hasWarnings = draft.checks.some((check) => check.toLowerCase().startsWith("warning"));

  return (
    <div>
      <header className="mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Human approval</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="max-w-4xl text-2xl font-semibold text-slate-900 sm:text-3xl">{subject}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone[draft.status] ?? statusTone.pending}`}>
              {formatStatus(draft.status)}
            </span>
          </div>
          <Link href={`/emails/${sourceEmail.id}`} className="mt-2 inline-flex text-sm font-medium text-teal-700 transition-all duration-150 hover:text-teal-800">
            Source email: {sourceEmail.subject}
          </Link>
        </div>
      </header>

      <div className="sticky top-0 z-10 mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-white/95 p-3 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={disabled}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Pencil size={17} aria-hidden="true" />}
            Save changes
          </button>
          <button
            type="button"
            onClick={handleNeedsRevision}
            disabled={disabled}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition-all duration-150 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "revision" ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <ShieldAlert size={17} aria-hidden="true" />}
            Mark needs revision
          </button>
          <button
            type="button"
            onClick={handleApproveDraft}
            disabled={disabled}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition-all duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "approve" ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
            Approve draft
          </button>
          {canShowSend ? (
            <button
              type="button"
              onClick={handleSendDraft}
              disabled={disabled}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "send" ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
              {isSent ? "Sent" : "Send with Gmail"}
            </button>
          ) : null}
          <DownloadQuotationPDFButton
            draft={{
              id: draft.id,
              subject,
              body,
              created_at: draft.createdAt,
            }}
            extracted={extraction}
            senderEmail={sourceEmail.sender}
            userEmail={userEmail}
          />
      </div>

      {!isPersisted ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          This is mock fallback data, so approval actions are disabled until real Supabase drafts exist.
        </p>
      ) : null}

      {message ? <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{message}</p> : null}
      {error ? <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p> : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <p className="text-sm text-slate-500">To: {draft.to}</p>
            <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="draft-subject">
              Draft subject
            </label>
            <input
              id="draft-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-all duration-150 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="p-5">
            <label className="block text-sm font-semibold text-slate-900" htmlFor="draft-body">
              Draft body
            </label>
            <textarea
              id="draft-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="mt-2 min-h-[430px] w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 outline-none transition-all duration-150 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
            <p className="mt-2 text-right text-xs text-slate-400">{body.length.toLocaleString("en")} characters</p>
          </div>
        </div>

        <aside className="space-y-5">
          <div className={`rounded-xl border p-5 shadow-sm ${hasWarnings ? "border-rose-200 bg-rose-50" : "border-teal-200 bg-teal-50"}`}>
            <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${hasWarnings ? "text-rose-950" : "text-teal-950"}`}>
              {hasWarnings ? <ShieldAlert size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
              Safety checks
            </div>
            <ul className={`space-y-3 text-sm ${hasWarnings ? "text-rose-950" : "text-teal-950"}`}>
              {draft.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Original email</p>
            <p className="mt-3 text-sm font-medium text-slate-900">{sourceEmail.subject}</p>
            <p className="mt-1 text-sm text-slate-500">{sourceEmail.sender} · {sourceEmail.category}</p>
            <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-600">{sourceEmail.body}</p>
            <Link href={`/emails/${sourceEmail.id}`} className="mt-4 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900">
              Open extraction
            </Link>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Extracted trade details</p>
            {extraction ? (
              <dl className="mt-4 grid gap-3 text-sm">
                {[
                  ["Product", extraction.product],
                  ["Quantity", extraction.quantity],
                  ["Price", extraction.price],
                  ["Incoterm", extraction.incoterm],
                  ["Origin", extraction.origin_country],
                  ["Destination", extraction.destination_country],
                  ["Delivery", extraction.delivery_date],
                  ["Payment terms", extraction.payment_terms],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-medium text-slate-900">{detailValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">No extracted trade details found yet.</p>
            )}
          </div>
        </aside>
      </section>
      <ToastNotice toast={toast} />
    </div>
  );
}
