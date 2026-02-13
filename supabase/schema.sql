create extension if not exists "pgcrypto";

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) > 0 and char_length(title) <= 200),
  url text not null check (url ~* '^https?://'),
  created_at timestamptz not null default now()
);

alter table public.bookmarks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookmarks'
      and policyname = 'bookmark_select_own'
  ) then
    create policy bookmark_select_own
      on public.bookmarks
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookmarks'
      and policyname = 'bookmark_insert_own'
  ) then
    create policy bookmark_insert_own
      on public.bookmarks
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookmarks'
      and policyname = 'bookmark_delete_own'
  ) then
    create policy bookmark_delete_own
      on public.bookmarks
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.bookmarks;
exception
  when duplicate_object then null;
end
$$;
