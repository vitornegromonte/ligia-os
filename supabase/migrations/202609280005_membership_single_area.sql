-- Each membership request must carry exactly one supported area value.
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
    or coalesce(trim(member_details->>'discipline'), '') not in ('ML','NLP','CV','Comunicação')
    or length(trim(coalesce(member_details->>'affiliation',''))) < 2 then
    raise exception 'Complete name, one area of discipline and affiliation' using errcode='22023';
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

revoke all on function public.submit_membership_request(jsonb) from public, anon, authenticated;
grant execute on function public.submit_membership_request(jsonb) to authenticated;
commit;
