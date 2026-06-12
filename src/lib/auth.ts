"use client";

import type { User } from "@supabase/supabase-js";
import { GMAIL_READONLY_SCOPE, GMAIL_SEND_SCOPE } from "@/lib/gmail";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export async function signInWithGoogle() {
  const supabase = createSupabaseBrowserClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: ["email", "profile", GMAIL_READONLY_SCOPE, GMAIL_SEND_SCOPE].join(" "),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function connectGmail() {
  return signInWithGoogle();
}

export async function signOut() {
  const response = await fetch("/api/auth/signout", {
    method: "POST",
  });

  if (!response.ok) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}
