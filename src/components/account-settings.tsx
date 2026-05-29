"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2, ShieldCheck, UserRound } from "lucide-react";
import { GmailConnection } from "@/components/gmail-connection";
import { getCurrentUser } from "@/lib/auth";
import { UserProfile } from "@/components/user-profile";

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
          setError(null);
        }
      } catch (settingsError) {
        if (isMounted) {
          setError(settingsError instanceof Error ? settingsError.message : "Unable to load account settings.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <ShieldCheck size={18} aria-hidden="true" />
          Connected account
        </div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-zinc-950">Supabase Google Auth</p>
            <p className="mt-1 text-sm text-zinc-500">Used for secure login to the MVP workspace.</p>
          </div>
          <span className="w-fit rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">Connected</span>
        </div>
      </div>

      <GmailConnection />

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <UserRound size={18} aria-hidden="true" />
          Supabase auth user info
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            Loading user details
          </div>
        ) : error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-zinc-500">Email</dt>
            <dd className="font-medium text-zinc-950">{user?.email ?? "Not available"}</dd>
            <dt className="text-zinc-500">User ID</dt>
            <dd className="break-all font-medium text-zinc-950">{user?.id ?? "Not available"}</dd>
            <dt className="text-zinc-500">Provider</dt>
            <dd className="font-medium text-zinc-950">{user?.app_metadata?.provider ?? "Google"}</dd>
          </dl>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-zinc-950">Session</p>
        <UserProfile />
      </div>
    </div>
  );
}
