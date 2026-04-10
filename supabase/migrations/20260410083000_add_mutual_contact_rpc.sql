create or replace function public.add_mutual_contact(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_user_id uuid := auth.uid();
    forward_inserted_count integer := 0;
    reverse_inserted_count integer := 0;
begin
    if actor_user_id is null then
        raise exception 'Authentication required';
    end if;

    if target_user_id is null then
        raise exception 'Target user is required';
    end if;

    if actor_user_id = target_user_id then
        return jsonb_build_object(
            'created_forward', false,
            'created_reverse', false,
            'is_self_scan', true
        );
    end if;

    if not exists (
        select 1
        from public.profiles
        where id = target_user_id
    ) then
        raise exception 'Target profile not found';
    end if;

    insert into public.user_contacts_log (user_id, contact_id)
    values (actor_user_id, target_user_id)
    on conflict (user_id, contact_id) do nothing;

    get diagnostics forward_inserted_count = row_count;

    insert into public.user_contacts_log (user_id, contact_id)
    values (target_user_id, actor_user_id)
    on conflict (user_id, contact_id) do nothing;

    get diagnostics reverse_inserted_count = row_count;

    return jsonb_build_object(
        'created_forward', forward_inserted_count > 0,
        'created_reverse', reverse_inserted_count > 0,
        'is_self_scan', false
    );
end;
$$;

revoke all on function public.add_mutual_contact(uuid) from public;
grant execute on function public.add_mutual_contact(uuid) to authenticated;
