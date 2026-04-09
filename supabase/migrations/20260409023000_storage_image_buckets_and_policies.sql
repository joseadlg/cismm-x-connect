insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 262144, array['image/jpeg', 'image/png', 'image/webp']),
  ('speakers', 'speakers', true, 314572, array['image/jpeg', 'image/png', 'image/webp']),
  ('exhibitors', 'exhibitors', true, 209715, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Speaker images are publicly accessible." on storage.objects;
create policy "Speaker images are publicly accessible."
on storage.objects
for select
to public
using (bucket_id = 'speakers');

drop policy if exists "Exhibitor logos are publicly accessible." on storage.objects;
create policy "Exhibitor logos are publicly accessible."
on storage.objects
for select
to public
using (bucket_id = 'exhibitors');

drop policy if exists "Users can delete their own avatar." on storage.objects;
create policy "Users can delete their own avatar."
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

drop policy if exists "Admins can upload speaker images." on storage.objects;
create policy "Admins can upload speaker images."
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'speakers'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update speaker images." on storage.objects;
create policy "Admins can update speaker images."
on storage.objects
for update
to authenticated
using (
  bucket_id = 'speakers'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'speakers'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete speaker images." on storage.objects;
create policy "Admins can delete speaker images."
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'speakers'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can upload exhibitor logos." on storage.objects;
create policy "Admins can upload exhibitor logos."
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exhibitors'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update exhibitor logos." on storage.objects;
create policy "Admins can update exhibitor logos."
on storage.objects
for update
to authenticated
using (
  bucket_id = 'exhibitors'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'exhibitors'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete exhibitor logos." on storage.objects;
create policy "Admins can delete exhibitor logos."
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exhibitors'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
