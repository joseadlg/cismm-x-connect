update public.profiles
set qr_login_code = null
where qr_login_code is not null;

drop index if exists public.profiles_qr_login_code_unique;
