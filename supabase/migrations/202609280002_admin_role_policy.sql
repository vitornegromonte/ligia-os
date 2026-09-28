-- Administrative promotion follows approved membership. The first administrator
-- is provisioned separately by a database owner, never by this client RPC.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.change_profile_role(target_id uuid, new_role text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor_role text; target public.profiles; updated public.profiles;
begin
  select p.role into actor_role from public.profiles p where p.id = (select auth.uid()) for update;
  if actor_role not in ('diretor','coordenador') or actor_role is null then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  if target_id = (select auth.uid()) then raise exception 'Cannot change your own role' using errcode='42501'; end if;
  if new_role not in ('externo','membro','diretor','coordenador') or new_role is null then
    raise exception 'Invalid role' using errcode='22023';
  end if;
  select * into target from public.profiles where id = target_id for update;
  if target.id is null then raise exception 'Profile not found' using errcode='P0002'; end if;
  if target.role = new_role then raise exception 'Role unchanged' using errcode='22023'; end if;
  if target.status_membro = 'pending' or exists (
    select 1 from public.membership_requests where profile_id = target_id and status = 'pending') then
    raise exception 'Review the pending membership request first' using errcode='23514';
  end if;
  if target.role = 'externo' or new_role = 'externo' then
    raise exception 'Administrative role changes require approved membership' using errcode='42501';
  end if;
  update public.profiles set role = new_role,
    status_membro = case when new_role = 'externo' then 'none'
      when new_role = 'membro' then 'approved'
      when status_membro = 'approved' then 'approved' else 'none' end
    where id = target_id returning * into updated;
  return updated;
end $$;

revoke all on function public.change_profile_role(uuid,text) from public, anon, authenticated;
grant execute on function public.change_profile_role(uuid,text) to authenticated;
commit;
