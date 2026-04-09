alter table public.profiles
add column if not exists attendee_category text not null default 'general';

alter table public.profiles
drop constraint if exists profiles_attendee_category_check;

alter table public.profiles
add constraint profiles_attendee_category_check
check (attendee_category = any (array['general'::text, 'vip'::text, 'juez'::text]));
