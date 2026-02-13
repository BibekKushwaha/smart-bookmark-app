import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type BookmarkPayload = {
  title?: string;
  url?: string;
};

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

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("id, title, url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load bookmarks." },
      { status: 500 },
    );
  }

  return NextResponse.json({ bookmarks: data });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as BookmarkPayload | null;
  const title = payload?.title?.trim();
  const normalizedUrl = payload?.url ? normalizeUrl(payload.url) : null;

  if (!title || !normalizedUrl) {
    return NextResponse.json(
      { error: "Title and a valid URL are required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      title,
      url: normalizedUrl,
      user_id: user.id,
    })
    .select("id, title, url, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save bookmark." }, { status: 500 });
  }

  return NextResponse.json({ bookmark: data }, { status: 201 });
}
