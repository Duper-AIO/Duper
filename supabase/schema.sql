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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'duper-media',
  'duper-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/mpeg',
    'audio/x-caf',
    'audio/3gpp'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own Duper media" on storage.objects;
drop policy if exists "Users can upload their own Duper media" on storage.objects;
drop policy if exists "Users can update their own Duper media" on storage.objects;
drop policy if exists "Users can delete their own Duper media" on storage.objects;

create policy "Users can read their own Duper media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'duper-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload their own Duper media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'duper-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own Duper media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'duper-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'duper-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own Duper media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'duper-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
