"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";

type FollowUpRow = {
  id: string;
  email_id: string | null;
  reminder_type: string | null;
  due_date: string | null;
  status: string | null;
  note: string | null;
  email_messages?: {
    subject?: string | null;
    sender?: string | null;
    category?: string | null;
  } | Array<{
    subject?: string | null;
    sender?: string | null;
    category?: string | null;
  }> | null;
};

function joinedEmail(followUp: FollowUpRow) {
  return Array.isArray(followUp.email_messages) ? followUp.email_messages[0] : followUp.email_messages;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function isOverdue(followUp: FollowUpRow) {
  return followUp.due_date ? new Date(followUp.due_date) < startOfToday() : false;
}

function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "Due date not set";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(dueDate));
}

function overdueLabel(dueDate: string | null) {
  if (!dueDate) {
    return "Due date not set";
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const overdueDays = Math.max(1, Math.floor((startOfToday().getTime() - new Date(dueDate).getTime()) / millisecondsPerDay));

  return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
}

function reminderLabel(reminderType: string | null) {
  return (reminderType ?? "manual").replaceAll("_", " ");
}

export function FollowUpsList() {
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/follow-ups", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? data.error ?? "Unable to load follow-ups.");
        }

        return data;
      })
      .then((data) => {
        if (isMounted) {
          setFollowUps(data.followUps ?? []);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load follow-ups.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function updateFollowUp(followUpId: string, action: "done" | "dismiss") {
    setUpdatingId(followUpId);
    setToast(null);

    try {
      const response = await fetch(`/api/follow-ups/${followUpId}/${action}`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to update follow-up.");
      }

      setFollowUps((current) => current.filter((followUp) => followUp.id !== followUpId));
      setToast({ type: "success", message: action === "done" ? "Follow-up marked as done." : "Follow-up dismissed." });
    } catch (updateError) {
      setToast({
        type: "error",
        message: updateError instanceof Error ? updateError.message : "Unable to update follow-up.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex animate-pulse items-center gap-2 rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading follow-ups
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>;
  }

  if (followUps.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-9 text-emerald-500" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">You are all caught up</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">No pending follow-ups need your attention.</p>
      </div>
    );
  }

  const overdue = followUps.filter(isOverdue);
  const upcoming = followUps.filter((followUp) => !isOverdue(followUp));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">{overdue.length} overdue</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{upcoming.length} upcoming</span>
      </div>
      {overdue.length ? <FollowUpSection title="Overdue" followUps={overdue} overdue onUpdate={updateFollowUp} updatingId={updatingId} /> : null}
      {upcoming.length ? <FollowUpSection title="Upcoming" followUps={upcoming} onUpdate={updateFollowUp} updatingId={updatingId} /> : null}
      <ToastNotice toast={toast} />
    </div>
  );
}

function FollowUpSection({
  title,
  followUps,
  overdue = false,
  updatingId,
  onUpdate,
}: {
  title: string;
  followUps: FollowUpRow[];
  overdue?: boolean;
  updatingId: string | null;
  onUpdate: (followUpId: string, action: "done" | "dismiss") => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
          {followUps.length}
        </span>
      </div>
      <div className="grid gap-3">
        {followUps.map((followUp) => (
          <FollowUpCard
            key={followUp.id}
            followUp={followUp}
            overdue={overdue}
            isUpdating={updatingId === followUp.id}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  );
}

function FollowUpCard({
  followUp,
  overdue,
  isUpdating,
  onUpdate,
}: {
  followUp: FollowUpRow;
  overdue: boolean;
  isUpdating: boolean;
  onUpdate: (followUpId: string, action: "done" | "dismiss") => void;
}) {
  const email = joinedEmail(followUp);

  return (
    <article className={`rounded-xl border border-l-4 bg-white p-4 shadow-sm transition-all duration-150 hover:shadow-md ${overdue ? "border-rose-100 border-l-rose-500" : "border-slate-100 border-l-amber-500"}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
              {reminderLabel(followUp.reminder_type)}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${overdue ? "text-rose-700" : "text-slate-500"}`}>
              <CalendarClock size={14} aria-hidden="true" />
              {overdue ? overdueLabel(followUp.due_date) : formatDueDate(followUp.due_date)}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-900">{followUp.note ?? "Review this trade email."}</p>
          {followUp.email_id ? (
            <Link href={`/emails/${followUp.email_id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-900">
              {email?.subject ?? "Open source email"}
              <ExternalLink size={14} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onUpdate(followUp.id, "done")}
            disabled={isUpdating}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
            Mark Done
          </button>
          <button
            type="button"
            onClick={() => onUpdate(followUp.id, "dismiss")}
            disabled={isUpdating}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={15} aria-hidden="true" />
            Dismiss
          </button>
        </div>
      </div>
    </article>
  );
}
