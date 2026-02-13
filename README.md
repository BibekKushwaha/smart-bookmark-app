# Smart Bookmark App

Next.js App Router app with Supabase Auth (Google OAuth), Postgres, and Realtime.

## Features Implemented

- Google OAuth only login/signup
- Private bookmarks per user (`user_id` + RLS)
- Add bookmark (`title` + `url`)
- Delete own bookmarks
- Realtime updates across open tabs

## Tech Stack

- Next.js (App Router)
- Tailwind CSS
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)



## 1) Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 2) Assignment Checklist Mapping

1. Google-only auth: `components/google-sign-in-button.tsx`, `app/auth/callback/route.ts`
2. Add bookmark: `components/bookmark-dashboard.tsx`, `app/api/bookmarks/route.ts`
3. Private per user: RLS policies in `supabase/schema.sql` + server checks
4. Realtime updates: Supabase Realtime subscription in `components/bookmark-dashboard.tsx`
5. Delete own bookmark: `app/api/bookmarks/[id]/route.ts`
6. Vercel deploy-ready: Next.js app + env setup 



## Problems Faced And How They Were Solved

1. OAuth redirect opened a dead Supabase domain (`DNS_PROBE_FINISHED_NXDOMAIN`).
- Cause: typo in `NEXT_PUBLIC_SUPABASE_URL` project ref.
- Fix: used the exact Supabase Project URL from dashboard and added strict URL validation in `lib/supabase/env.ts`.

2. Realtime update between two tabs was sometimes inconsistent.
- Cause: relying only on websocket realtime can fail in some local/dev browser conditions.
- Fix: kept Supabase Realtime subscription and added cross-tab fallback with `BroadcastChannel` + `storage` event in `components/bookmark-dashboard.tsx`.

3. Build issues with Turbopack in restricted local environment.
- Cause: local environment restrictions while running Turbopack workers.
- Fix: switched build script to webpack mode (`next build --webpack`) for stable CI/deployment behavior.

## Submission Info

- Live Vercel URL: `https://smart-bookmark-app-sigma-gules.vercel.app`
- Public GitHub repo: `https://github.com/BibekKushwaha/smart-bookmark-app`
