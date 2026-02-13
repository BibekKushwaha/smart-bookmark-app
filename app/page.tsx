import { BookmarkDashboard } from "@/components/bookmark-dashboard";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Bookmark } from "@/lib/supabase/types";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Smart Bookmark App
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Sign in with Google to create private bookmarks that sync in
            realtime across tabs.
          </p>
          <div className="mt-8">
            <GoogleSignInButton />
          </div>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("id, title, url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const initialBookmarks: Bookmark[] = data ?? [];
  const initialError = error
    ? "Could not load existing bookmarks. You can still add new ones."
    : null;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <BookmarkDashboard
          initialBookmarks={initialBookmarks}
          initialError={initialError}
          userEmail={user.email ?? "Google User"}
          userId={user.id}
        />
      </div>
    </main>
  );
}
