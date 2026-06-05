"use client";

import { useState } from "react";
import { Globe2, Loader2 } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export function LoginActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google login failed. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading || !isSupabaseConfigured}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Globe2 size={18} aria-hidden="true" />}
        {isLoading ? "Connecting..." : "Continue with Google"}
      </button>

      {!isSupabaseConfigured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Supabase keys are missing. Add them to your local `.env.local` before using Google login.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
