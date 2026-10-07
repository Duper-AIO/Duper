create table if not exists public.duper_user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

grant select, insert, update, delete on public.duper_user_data to authenticated;

alter table public.duper_user_data enable row level security;

drop policy if exists "Users can read their own Duper data" on public.duper_user_data;
drop policy if exists "Users can insert their own Duper data" on public.duper_user_data;
drop policy if exists "Users can update their own Duper data" on public.duper_user_data;
drop policy if exists "Users can delete their own Duper data" on public.duper_user_data;

create policy "Users can read their own Duper data"
  on public.duper_user_data for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own Duper data"
  on public.duper_user_data for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own Duper data"
  on public.duper_user_data for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own Duper data"
  on public.duper_user_data for delete
  using ((select auth.uid()) = user_id);
