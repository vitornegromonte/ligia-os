-- Membership requests use discipline as the selected areas and require affiliation.
-- team remains an existing profile field and is not part of this request contract.
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
    or length(trim(coalesce(member_details->>'discipline',''))) < 2
    or length(trim(coalesce(member_details->>'affiliation',''))) < 2 then
    raise exception 'Complete name, discipline and affiliation' using errcode='22023';
  end if;
  insert into public.membership_requests(profile_id, details)
    values (actor_id, jsonb_build_object(
      'name', trim(member_details->>'name'),
      'discipline', trim(member_details->>'discipline'),
      'affiliation', trim(member_details->>'affiliation')) || jsonb_strip_nulls(jsonb_build_object(
      'bio', nullif(trim(member_details->>'bio'), ''),
      'github', nullif(trim(member_details->>'github'), ''),
      'linkedin', nullif(trim(member_details->>'linkedin'), ''))))
    returning * into created;
  update public.profiles set status_membro = 'pending' where id = actor_id;
  return created;
end
$$;

-- Do not overwrite the legacy team field from a request that no longer has it.
-- Preserve optional profile values when old or new requests omit them.
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
      name = target.details->>'name',
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

revoke all on function public.submit_membership_request(jsonb), public.review_membership_request(uuid,boolean) from public, anon, authenticated;
grant execute on function public.submit_membership_request(jsonb), public.review_membership_request(uuid,boolean) to authenticated;

commit;
