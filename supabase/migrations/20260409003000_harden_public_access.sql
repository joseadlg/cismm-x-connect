begin;

create schema if not exists private;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create or replace function private.current_user_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.name
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() = 'admin', false)
$$;

alter table public.speakers enable row level security;
alter table public.exhibitor_categories enable row level security;
alter table public.exhibitors enable row level security;
alter table public.agenda_sessions enable row level security;
alter table public.session_speakers enable row level security;
alter table public.news_posts enable row level security;

drop policy if exists "Manage speakers as admin" on public.speakers;
create policy "Manage speakers as admin"
on public.speakers
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Manage exhibitor categories as admin" on public.exhibitor_categories;
create policy "Manage exhibitor categories as admin"
on public.exhibitor_categories
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Manage exhibitors as admin" on public.exhibitors;
create policy "Manage exhibitors as admin"
on public.exhibitors
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Manage agenda sessions as admin" on public.agenda_sessions;
create policy "Manage agenda sessions as admin"
on public.agenda_sessions
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Manage session speakers as admin" on public.session_speakers;
create policy "Manage session speakers as admin"
on public.session_speakers
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins and Exhibitors can insert news posts" on public.news_posts;
drop policy if exists "Admins can delete any news post" on public.news_posts;
drop policy if exists "Exhibitors can delete their own news posts" on public.news_posts;
drop policy if exists "Admins can update any news post" on public.news_posts;

create policy "Admins and exhibitors can insert their own news posts"
on public.news_posts
for insert
to authenticated
with check (
  private.current_user_role() in ('admin', 'exhibitor')
  and author_id = (select auth.uid())
  and author_name = private.current_user_name()
  and author_role = private.current_user_role()
);

create policy "Admins can update any news post"
on public.news_posts
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can delete any news post"
on public.news_posts
for delete
to authenticated
using (private.is_admin());

create policy "Exhibitors can delete their own news posts"
on public.news_posts
for delete
to authenticated
using (
  private.current_user_role() = 'exhibitor'
  and (
    author_id = (select auth.uid())
    or author_name = private.current_user_name()
  )
);

drop policy if exists "Users can only read their own data" on public.user_agenda;
drop policy if exists "Users can read own agenda" on public.user_agenda;
drop policy if exists "Users can insert own agenda" on public.user_agenda;
drop policy if exists "Users can delete own agenda" on public.user_agenda;
drop policy if exists "Admins can read all agendas" on public.user_agenda;

create policy "Users can read own agenda"
on public.user_agenda
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own agenda"
on public.user_agenda
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete own agenda"
on public.user_agenda
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Admins can read all agendas"
on public.user_agenda
for select
to authenticated
using (private.is_admin());

drop policy if exists "Users can only read their own data" on public.user_session_checkins;
drop policy if exists "Users can read own checkins" on public.user_session_checkins;
drop policy if exists "Users can insert own checkins" on public.user_session_checkins;
drop policy if exists "Admins can read all checkins" on public.user_session_checkins;

create policy "Users can read own checkins"
on public.user_session_checkins
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own checkins"
on public.user_session_checkins
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Admins can read all checkins"
on public.user_session_checkins
for select
to authenticated
using (private.is_admin());

drop policy if exists "Users can only read their own data" on public.user_visited_exhibitors;
drop policy if exists "Users can read own exhibitor visits" on public.user_visited_exhibitors;
drop policy if exists "Users can insert own exhibitor visits" on public.user_visited_exhibitors;
drop policy if exists "Admins can read all exhibitor visits" on public.user_visited_exhibitors;

create policy "Users can read own exhibitor visits"
on public.user_visited_exhibitors
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own exhibitor visits"
on public.user_visited_exhibitors
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Admins can read all exhibitor visits"
on public.user_visited_exhibitors
for select
to authenticated
using (private.is_admin());

drop policy if exists "Users can only read their own data" on public.user_contacts;
drop policy if exists "Users can read own contacts" on public.user_contacts;
drop policy if exists "Users can insert own contacts" on public.user_contacts;
drop policy if exists "Admins can read all contacts" on public.user_contacts;

create policy "Users can read own contacts"
on public.user_contacts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own contacts"
on public.user_contacts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Admins can read all contacts"
on public.user_contacts
for select
to authenticated
using (private.is_admin());

drop policy if exists "Users can read their own contacts logs." on public.user_contacts_log;
drop policy if exists "Users can insert their own contacts logs." on public.user_contacts_log;
drop policy if exists "Admins can read all contact logs" on public.user_contacts_log;

create policy "Users can read their own contacts logs."
on public.user_contacts_log
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own contacts logs."
on public.user_contacts_log
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Admins can read all contact logs"
on public.user_contacts_log
for select
to authenticated
using (private.is_admin());

drop policy if exists "Users can read own ratings." on public.session_ratings;
drop policy if exists "Users can insert own ratings." on public.session_ratings;
drop policy if exists "Admins can read all ratings" on public.session_ratings;

create policy "Users can read own ratings."
on public.session_ratings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own ratings."
on public.session_ratings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Admins can read all ratings"
on public.session_ratings
for select
to authenticated
using (private.is_admin());

revoke all on table public.speakers from public, anon, authenticated;
revoke all on table public.exhibitor_categories from public, anon, authenticated;
revoke all on table public.exhibitors from public, anon, authenticated;
revoke all on table public.agenda_sessions from public, anon, authenticated;
revoke all on table public.session_speakers from public, anon, authenticated;
revoke all on table public.news_posts from public, anon, authenticated;
revoke all on table public.user_agenda from public, anon, authenticated;
revoke all on table public.user_session_checkins from public, anon, authenticated;
revoke all on table public.user_visited_exhibitors from public, anon, authenticated;
revoke all on table public.user_contacts from public, anon, authenticated;
revoke all on table public.user_contacts_log from public, anon, authenticated;
revoke all on table public.session_ratings from public, anon, authenticated;
revoke all on table public.top_sessions from public, anon, authenticated;
revoke all on table public.top_exhibitors from public, anon, authenticated;

grant select on table public.speakers to anon, authenticated;
grant select on table public.exhibitor_categories to anon, authenticated;
grant select on table public.exhibitors to anon, authenticated;
grant select on table public.agenda_sessions to anon, authenticated;
grant select on table public.session_speakers to anon, authenticated;
grant select on table public.news_posts to anon, authenticated;
grant insert, update, delete on table public.speakers to authenticated;
grant insert, update, delete on table public.exhibitor_categories to authenticated;
grant insert, update, delete on table public.exhibitors to authenticated;
grant insert, update, delete on table public.agenda_sessions to authenticated;
grant insert, update, delete on table public.session_speakers to authenticated;
grant insert, update, delete on table public.news_posts to authenticated;

grant select, insert, delete on table public.user_agenda to authenticated;
grant select, insert on table public.user_session_checkins to authenticated;
grant select, insert on table public.user_visited_exhibitors to authenticated;
grant select, insert on table public.user_contacts to authenticated;
grant select, insert on table public.user_contacts_log to authenticated;
grant select, insert on table public.session_ratings to authenticated;

grant usage, select on sequence public.speakers_id_seq to authenticated;
grant usage, select on sequence public.exhibitor_categories_id_seq to authenticated;
grant usage, select on sequence public.exhibitors_id_seq to authenticated;
grant usage, select on sequence public.agenda_sessions_id_seq to authenticated;
grant usage, select on sequence public.news_posts_id_seq to authenticated;

alter view public.top_sessions set (security_invoker = true);
alter view public.top_exhibitors set (security_invoker = true);

grant select on table public.top_sessions to authenticated;
grant select on table public.top_exhibitors to authenticated;

create or replace function public.get_peak_activity_hours()
returns table(activity_hour timestamp without time zone, activity_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can access event analytics';
  end if;

  return query
  select date_trunc('hour', all_activities.created_at) as activity_hour,
         count(*) as activity_count
  from (
    select usc.created_at from public.user_session_checkins as usc
    union all
    select uve.created_at from public.user_visited_exhibitors as uve
    union all
    select ucl.created_at from public.user_contacts_log as ucl
  ) as all_activities
  group by activity_hour
  order by activity_hour asc;
end;
$$;

revoke execute on function public.get_peak_activity_hours() from public, anon, authenticated;
grant execute on function public.get_peak_activity_hours() to authenticated;

commit;
