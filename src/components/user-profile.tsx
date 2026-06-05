"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogOut, Loader2, UserRound } from "lucide-react";
import { getCurrentUser, signOut } from "@/lib/auth";

export function UserProfile({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
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
      } catch (profileError) {
        if (isMounted) {
          setError(profileError instanceof Error ? profileError.message : "Unable to load user profile.");
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

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);

    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Logout failed. Please try again.");
      setIsSigningOut(false);
    }
  }

  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading user
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${compact ? "flex-col" : "flex-col items-end sm:flex-row sm:items-center"}`}>
      <div className={`flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 ${compact ? "" : "shadow-sm"}`}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900">{user?.email ?? "Signed in user"}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{error ?? "Google account"}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
        Logout
      </button>
    </div>
  );
}
