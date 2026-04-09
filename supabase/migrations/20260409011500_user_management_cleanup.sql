-- Keep historical news posts when removing user accounts and backfill missing profile emails.

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or btrim(p.email) = '');

alter table public.news_posts
drop constraint if exists news_posts_author_id_fkey;

alter table public.news_posts
add constraint news_posts_author_id_fkey
foreign key (author_id)
references public.profiles(id)
on delete set null;
