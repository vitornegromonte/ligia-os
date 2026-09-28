-- Membership requests now validate access for existing Ligia members.
-- Keep the established table and RPC contract; motivation was only needed by
-- the former recruitment-style UI and remains untouched in historical JSONB.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.submit_membership_request(member_details jsonb) returns public.membership_requests
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); actor public.profiles; created public.membership_requests;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into actor from public.profiles where id = actor_id for update;
  if actor.id is null or actor.role <> 'externo' or actor.status_membro = 'pending' then
    raise exception 'Not eligible to submit an access request' using errcode='42501';
  end if;
  if jsonb_typeof(member_details) is distinct from 'object'
    or length(trim(coalesce(member_details->>'name',''))) < 2
    or length(trim(coalesce(member_details->>'team',''))) < 2
    or length(trim(coalesce(member_details->>'discipline',''))) < 2 then
    raise exception 'Complete name, team and discipline' using errcode='22023';
  end if;
  insert into public.membership_requests(profile_id, details)
    values (actor_id, jsonb_build_object(
      'name', trim(member_details->>'name'), 'team', trim(member_details->>'team'),
      'discipline', trim(member_details->>'discipline'),
      'affiliation', trim(coalesce(member_details->>'affiliation','')),
      'bio', trim(coalesce(member_details->>'bio','')),
      'github', trim(coalesce(member_details->>'github','')),
      'linkedin', trim(coalesce(member_details->>'linkedin',''))))
    returning * into created;
  update public.profiles set status_membro = 'pending' where id = actor_id;
  return created;
end
$$;

revoke all on function public.submit_membership_request(jsonb) from public, anon, authenticated;
grant execute on function public.submit_membership_request(jsonb) to authenticated;

commit;
