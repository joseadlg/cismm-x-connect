alter table public.profiles
add column if not exists qr_login_code text;

create unique index if not exists profiles_qr_login_code_unique
on public.profiles (qr_login_code)
where qr_login_code is not null;
