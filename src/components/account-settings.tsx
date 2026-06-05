"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BriefcaseBusiness, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { GmailConnection } from "@/components/gmail-connection";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { UserProfile } from "@/components/user-profile";

type BusinessRole = "buyer" | "seller" | "both";

const roleOptions: Array<{ label: string; value: BusinessRole }> = [
  { label: "Buyer / Importer", value: "buyer" },
  { label: "Seller / Exporter", value: "seller" },
  { label: "Both", value: "both" },
];

function isBusinessRole(value: unknown): value is BusinessRole {
  return value === "buyer" || value === "seller" || value === "both";
}

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [isRoleSaving, setIsRoleSaving] = useState(false);
  const [businessRole, setBusinessRole] = useState<BusinessRole>("both");
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
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

        if (currentUser) {
          const supabase = createSupabaseBrowserClient();
          const { data, error: profileError } = await supabase
            .from("users_profile")
            .select("business_role")
            .eq("id", currentUser.id)
            .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (isMounted) {
            setBusinessRole(isBusinessRole(data?.business_role) ? data.business_role : "both");
            setRoleError(null);
          }
        }
      } catch (settingsError) {
        if (isMounted) {
          setError(settingsError instanceof Error ? settingsError.message : "Unable to load account settings.");
          setRoleError(settingsError instanceof Error ? settingsError.message : "Unable to load business role.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRoleLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSaveBusinessRole() {
    if (!user) {
      setRoleError("Sign in before saving your business role.");
      return;
    }

    setIsRoleSaving(true);
    setRoleMessage(null);
    setRoleError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: saveError } = await supabase.from("users_profile").upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        business_role: businessRole,
      });

      if (saveError) {
        throw saveError;
      }

      setRoleMessage("Business role saved.");
    } catch (saveRoleError) {
      setRoleError(saveRoleError instanceof Error ? saveRoleError.message : "Unable to save business role.");
    } finally {
      setIsRoleSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck size={18} aria-hidden="true" />
          Connected account
        </div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-900">Supabase Google Auth</p>
            <p className="mt-1 text-sm text-slate-500">Used for secure login to the workspace.</p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Connected</span>
        </div>
      </div>

      <GmailConnection />

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BriefcaseBusiness size={18} aria-hidden="true" />
          My business role
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:w-80">
            My business role
            <select
              value={businessRole}
              onChange={(event) => setBusinessRole(event.target.value as BusinessRole)}
              disabled={isRoleLoading || isRoleSaving || !user}
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-all duration-150 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleSaveBusinessRole}
            disabled={isRoleLoading || isRoleSaving || !user}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRoleSaving ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : null}
            {isRoleSaving ? "Saving..." : "Save role"}
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This helps the AI decide whether to act like a buyer, seller, or coordinator for each trade email.
        </p>
        {roleMessage ? <p className="mt-3 text-sm font-medium text-teal-800">{roleMessage}</p> : null}
        {roleError ? <p className="mt-3 text-sm font-medium text-rose-700">{roleError}</p> : null}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserRound size={18} aria-hidden="true" />
          Supabase auth user info
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            Loading user details
          </div>
        ) : error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{user?.email ?? "Not available"}</dd>
            <dt className="text-slate-500">User ID</dt>
            <dd className="break-all font-medium text-slate-900">{user?.id ?? "Not available"}</dd>
            <dt className="text-slate-500">Provider</dt>
            <dd className="font-medium text-slate-900">{user?.app_metadata?.provider ?? "Google"}</dd>
          </dl>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-slate-900">Session</p>
        <UserProfile />
      </div>
    </div>
  );
}
