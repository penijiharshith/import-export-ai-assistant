"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogOut, Loader2, UserRound } from "lucide-react";
import { getCurrentUser, signOut } from "@/lib/auth";

export function UserProfile() {
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
      <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
        <Loader2 className="animate-spin" size={16} aria-hidden="true" />
        Loading user
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-sm">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-zinc-100 text-zinc-600">
            <UserRound size={16} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="max-w-40 truncate text-sm font-semibold text-zinc-950">{user?.email ?? "Signed in user"}</p>
          {error ? <p className="max-w-40 truncate text-xs text-rose-700">{error}</p> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
        Logout
      </button>
    </div>
  );
}
