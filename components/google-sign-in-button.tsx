"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-danger">
          Sign-in failed: {errorMessage}. Confirm Google provider is enabled in
          Supabase Auth.
        </p>
      ) : null}
    </div>
  );
}
