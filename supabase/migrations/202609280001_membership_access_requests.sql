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
      'discipline', trim(member_details->>'discipline')) || jsonb_strip_nulls(jsonb_build_object(
      'affiliation', nullif(trim(member_details->>'affiliation'), ''),
      'bio', nullif(trim(member_details->>'bio'), ''),
      'github', nullif(trim(member_details->>'github'), ''),
      'linkedin', nullif(trim(member_details->>'linkedin'), ''))))
    returning * into created;
  update public.profiles set status_membro = 'pending' where id = actor_id;
  return created;
end
$$;

revoke all on function public.submit_membership_request(jsonb) from public, anon, authenticated;
grant execute on function public.submit_membership_request(jsonb) to authenticated;

-- An omitted or blank optional field in an access request is not an instruction
-- to clear a value already saved on the applicant's profile.
create or replace function public.review_membership_request(request_id uuid, approve boolean) returns public.membership_requests
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); actor_role text; target public.membership_requests; result public.membership_requests;
begin
  if approve is null then raise exception 'Review decision required' using errcode='22023'; end if;
  select role into actor_role from public.profiles where id = actor_id for update;
  if actor_role not in ('diretor','coordenador') or actor_role is null then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  select * into target from public.membership_requests where id = request_id for update;
  if target.id is null or target.status <> 'pending' then
    raise exception 'Pending request not found' using errcode='P0002';
  end if;
  if target.profile_id = actor_id then raise exception 'Cannot review your own request' using errcode='42501'; end if;
  if not exists (select 1 from public.profiles where id = target.profile_id and role = 'externo' and status_membro = 'pending' for update) then
    raise exception 'Applicant state changed' using errcode='23514';
  end if;
  if approve then
    update public.profiles p set role = 'membro', status_membro = 'approved',
      name = target.details->>'name', team = target.details->>'team',
      discipline = target.details->>'discipline',
      affiliation = coalesce(nullif(trim(target.details->>'affiliation'), ''), p.affiliation),
      bio = coalesce(nullif(trim(target.details->>'bio'), ''), p.bio),
      github = coalesce(nullif(trim(target.details->>'github'), ''), p.github),
      linkedin = coalesce(nullif(trim(target.details->>'linkedin'), ''), p.linkedin)
      where p.id = target.profile_id;
  else
    update public.profiles set status_membro = 'rejected' where id = target.profile_id;
  end if;
  update public.membership_requests set status = case when approve then 'approved' else 'rejected' end,
    reviewed_by = actor_id, reviewed_at = now() where id = request_id returning * into result;
  return result;
end $$;
revoke all on function public.review_membership_request(uuid,boolean) from public, anon, authenticated;
grant execute on function public.review_membership_request(uuid,boolean) to authenticated;

commit;
