"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Bookmark } from "@/lib/supabase/types";

type BookmarkDashboardProps = {
  initialBookmarks: Bookmark[];
  initialError: string | null;
  userEmail: string;
  userId: string;
};

const TAB_SYNC_KEY = "smart-bookmark-sync";
const TAB_SYNC_CHANNEL = "smart-bookmark-sync-channel";

function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function BookmarkDashboard({
  initialBookmarks,
  initialError,
  userEmail,
  userId,
}: BookmarkDashboardProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState(initialError);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const loadBookmarks = useCallback(async () => {
    const response = await fetch("/api/bookmarks", {
      cache: "no-store",
    });

    if (!response.ok) {
      setErrorMessage("Failed to refresh bookmarks.");
      return;
    }

    const payload = (await response.json()) as { bookmarks: Bookmark[] };
    setBookmarks(payload.bookmarks);
  }, []);

  const notifyOtherTabs = useCallback(() => {
    const syncPayload = {
      userId,
      timestamp: Date.now(),
    };

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(TAB_SYNC_CHANNEL);
      channel.postMessage(syncPayload);
      channel.close();
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(TAB_SYNC_KEY, JSON.stringify(syncPayload));
    }
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel(`bookmarks-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadBookmarks();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadBookmarks, supabase, userId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TAB_SYNC_KEY || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as { userId?: string };
        if (payload.userId === userId) {
          void loadBookmarks();
        }
      } catch(error) {
        console.log(error);
        // Ignore malformed values.
      }
    };

    window.addEventListener("storage", onStorage);

    let broadcastChannel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      broadcastChannel = new BroadcastChannel(TAB_SYNC_CHANNEL);
      broadcastChannel.onmessage = (event: MessageEvent<{ userId?: string }>) => {
        if (event.data?.userId === userId) {
          void loadBookmarks();
        }
      };
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [loadBookmarks, userId]);

  const handleCreateBookmark = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUrl = normalizeUrl(url);
    const trimmedTitle = title.trim();

    if (!trimmedTitle || !normalizedUrl) {
      setErrorMessage("Enter a valid title and URL.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          url: normalizedUrl,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMessage(payload?.error ?? "Failed to add bookmark.");
        return;
      }

      setTitle("");
      setUrl("");
      await loadBookmarks();
      notifyOtherTabs();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    setDeleteId(id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMessage(payload?.error ?? "Failed to delete bookmark.");
        return;
      }

      await loadBookmarks();
      notifyOtherTabs();
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Smart Bookmark App
          </h1>
          <p className="mt-2 text-sm text-muted">Signed in as {userEmail}</p>
        </div>
        <form action="/auth/signout" className="hidden sm:block" method="post">
          <button
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-slate-50"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={handleCreateBookmark}
      >
        <input
          className="h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bookmark title"
          required
          type="text"
          value={title}
        />
        <input
          className="h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          required
          type="text"
          value={url}
        />
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Adding..." : "Add Bookmark"}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-3 text-sm text-danger">{errorMessage}</p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {bookmarks.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted">
            No bookmarks yet. Add your first one.
          </li>
        ) : (
          bookmarks.map((bookmark) => (
            <li
              className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              key={bookmark.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{bookmark.title}</p>
                <a
                  className="mt-1 block truncate text-sm text-primary hover:underline"
                  href={bookmark.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {bookmark.url}
                </a>
              </div>
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg border border-danger px-3 text-sm font-medium text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteId === bookmark.id}
                onClick={() => void handleDeleteBookmark(bookmark.id)}
                type="button"
              >
                {deleteId === bookmark.id ? "Deleting..." : "Delete"}
              </button>
            </li>
          ))
        )}
      </ul>

      <form action="/auth/signout" className="mt-8 border-t border-border pt-4 sm:hidden" method="post">
        <button
          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-slate-50"
          type="submit"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}
