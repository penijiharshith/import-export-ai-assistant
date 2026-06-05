"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Mail, RefreshCw } from "lucide-react";
import { ToastNotice, type ToastState } from "@/components/toast-notice";
import { connectGmail } from "@/lib/auth";
import type { GmailMessagePreview, GmailPermissionDebug } from "@/lib/gmail";

type PermissionDebugResponse = GmailPermissionDebug & {
  scopeCheckError?: string | null;
};

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function formatReceivedAt(receivedAt: string | null) {
  if (!receivedAt) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(receivedAt));
}

export function GmailConnection() {
  const [debug, setDebug] = useState<PermissionDebugResponse | null>(null);
  const [messages, setMessages] = useState<GmailMessagePreview[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadPermissionDebug = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/debug", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to verify Gmail permission.");
      }

      setDebug(data);
    } catch (debugError) {
      setError(debugError instanceof Error ? debugError.message : "Unable to verify Gmail permission.");
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadPermissionDebug();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPermissionDebug]);

  async function handleConnectGmail() {
    setIsConnecting(true);
    setError(null);

    try {
      await connectGmail();
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : "Unable to start Gmail connection.";
      setError(message);
      setToast({ type: "error", message });
      setIsConnecting(false);
    }
  }

  async function handleFetchEmails() {
    setIsFetchingMessages(true);
    setError(null);
    setSyncSummary(null);

    try {
      const response = await fetch("/api/gmail/sync", {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Unable to fetch Gmail emails.");
      }

      setMessages(data.messages ?? []);
      setSyncSummary(`Synced ${data.synced ?? 0} emails: ${data.inserted ?? 0} inserted, ${data.updated ?? 0} updated.`);
      setToast({ type: "success", message: `Gmail sync complete: ${data.synced ?? 0} emails processed.` });
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unable to fetch Gmail emails.";
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setIsFetchingMessages(false);
    }
  }

  const providerTokenExists = debug?.providerTokenExists ?? false;
  const gmailPermissionGranted = debug?.gmailPermissionGranted ?? false;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Mail size={18} aria-hidden="true" />
        Gmail connection
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Gmail connected</p>
          <p className={`mt-2 text-xl font-semibold ${providerTokenExists ? "text-teal-800" : "text-amber-900"}`}>
            {yesNo(providerTokenExists)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Gmail permission granted</p>
          <p className={`mt-2 text-xl font-semibold ${gmailPermissionGranted ? "text-teal-800" : "text-amber-900"}`}>
            {yesNo(gmailPermissionGranted)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleConnectGmail}
          disabled={isConnecting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
          {isConnecting ? "Connecting..." : "Connect Gmail"}
        </button>
        <button
          type="button"
          onClick={loadPermissionDebug}
          disabled={isChecking}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isChecking ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
          {isChecking ? "Checking..." : "Refresh permission status"}
        </button>
        <button
          type="button"
          onClick={handleFetchEmails}
          disabled={isFetchingMessages}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetchingMessages ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Inbox size={16} aria-hidden="true" />}
          {isFetchingMessages ? "Fetching..." : "Fetch latest Gmail emails"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-900">
          {error}
        </p>
      ) : null}

      {syncSummary ? (
        <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-900">
          {syncSummary}
        </p>
      ) : null}

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Inbox size={16} aria-hidden="true" />
          Latest Gmail emails
        </div>

        {messages.length === 0 ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            No Gmail emails loaded yet. Click &quot;Fetch latest Gmail emails&quot; after connecting Gmail.
          </div>
        ) : (
          <div className="grid gap-3">
            {messages.map((message) => (
              <article key={message.gmail_message_id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">{message.subject}</h3>
                    <p className="mt-1 text-sm text-slate-500">{message.sender}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatReceivedAt(message.received_at)}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{message.snippet}</p>
                <p className="mt-3 break-all text-xs text-slate-400">Gmail ID: {message.gmail_message_id}</p>
              </article>
            ))}
          </div>
        )}
      </div>
      <ToastNotice toast={toast} />
    </div>
  );
}
