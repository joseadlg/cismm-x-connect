alter table public.profiles
add column if not exists speaker_id integer;

alter table public.profiles
drop constraint if exists profiles_speaker_id_fkey;

alter table public.profiles
add constraint profiles_speaker_id_fkey
foreign key (speaker_id)
references public.speakers (id)
on delete set null;
