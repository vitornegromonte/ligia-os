-- Disposable local cluster only. Exercises the final roles against real RLS and RPCs.
insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','external@test'),
 ('10000000-0000-0000-0000-000000000002','director@test'),
 ('10000000-0000-0000-0000-000000000003','coordinator@test'),
 ('10000000-0000-0000-0000-000000000004','member@test'),
 ('10000000-0000-0000-0000-000000000005','rejected@test'),
 ('10000000-0000-0000-0000-000000000006','professor@test');
update public.profiles set role='diretor' where email='director@test';
update public.profiles set role='coordenador', category='professor' where email='coordinator@test';
update public.profiles set role='membro', status_membro='approved' where email='member@test';
update public.profiles set role='membro', status_membro='approved', category='professor' where email='professor@test';
update public.profiles set team='Existing team', bio='Existing biography', github='https://github.com/existing'
  where email='external@test';
do $$ begin
 if (select count(*) from public.profiles where role='externo' and status_membro='none') <> 2 then
   raise exception 'Signup must create external profiles';
 end if;
 if (select status_membro from public.profiles where email='coordinator@test') <> 'none' then
   raise exception 'Professor coordinator was given a fictitious membership approval';
 end if;
 if has_column_privilege('authenticated','public.challenges','tests','SELECT') then
   raise exception 'Private challenge tests are readable';
 end if;
 if has_column_privilege('authenticated','public.profiles','role','UPDATE') or
    has_column_privilege('authenticated','public.profiles','status_membro','UPDATE') then
   raise exception 'Clients can directly edit authorization fields';
 end if;
 if has_table_privilege('authenticated','public.role_change_audit','INSERT') or
    has_table_privilege('authenticated','public.role_change_audit','UPDATE') or
    has_table_privilege('authenticated','public.role_change_audit','DELETE') then
   raise exception 'Clients can write role audit';
 end if;
 if not has_column_privilege('authenticated','public.challenges','title','SELECT') then
   raise exception 'Public challenge fields are unavailable';
 end if;
end $$;

set role authenticated;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
do $$ begin
 begin
   perform public.submit_membership_request('{"name":"External Student","discipline":"ML, NLP","affiliation":"CIn-UFPE"}'::jsonb);
   raise exception 'Multiple areas were accepted';
 exception when invalid_parameter_value then null; end;
 begin
   perform public.submit_membership_request('{"name":"External Student","discipline":"ML"}'::jsonb);
   raise exception 'Missing institution was accepted';
 exception when invalid_parameter_value then null; end;
end $$;
do $$ begin
 if public.is_member_or_admin() or public.is_admin() then raise exception 'External gained internal role'; end if;
 if exists(select 1 from public.projects) then raise exception 'External can read internal projects'; end if;
 if (select count(*) from public.profiles) <> 1 then raise exception 'External can read other profiles'; end if;
 if exists (select 1 from public.role_change_audit) then raise exception 'External can read role audit'; end if;
 begin
   perform tests from public.challenges limit 1;
   raise exception 'Challenge tests were exposed';
 exception when insufficient_privilege then null;
 end;
 begin
   update public.profiles set role='diretor' where id=auth.uid();
   raise exception 'Direct role update succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
   insert into public.membership_requests(profile_id,details) values(auth.uid(),'{}'::jsonb);
   raise exception 'Direct request insert succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.review_membership_request(gen_random_uuid(), true);
   raise exception 'External review succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.change_profile_role(auth.uid(),'coordenador');
   raise exception 'External role change succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
select public.submit_membership_request('{"name":"External Student","discipline":"ML","affiliation":"CIn-UFPE"}'::jsonb);
do $$ begin
 if (select status_membro from public.profiles where id=auth.uid()) <> 'pending' then raise exception 'Not pending'; end if;
 if (select count(*) from public.membership_requests) <> 1 then raise exception 'Applicant request visibility mismatch'; end if;
 if (select details ? 'motivation' from public.membership_requests limit 1) then raise exception 'New access requests must not persist motivation'; end if;
 if (select details ? 'bio' or details ? 'github' from public.membership_requests limit 1) then
   raise exception 'Omitted optional fields must stay omitted';
 end if;
 if (select details ? 'team' from public.membership_requests limit 1) then
   raise exception 'Team must not be part of membership request';
 end if;
 if public.is_member_or_admin() then raise exception 'Pending gave internal access'; end if;
 begin
   perform public.submit_membership_request('{"name":"External Student","discipline":"NLP","affiliation":"CIn-UFPE"}'::jsonb);
   raise exception 'Duplicate request accepted';
 exception when insufficient_privilege then null;
 end;
end $$;

set request.jwt.claim.sub='10000000-0000-0000-0000-000000000004';
do $$ begin
 if not public.is_member_or_admin() or public.is_admin() then raise exception 'Member capability mismatch'; end if;
 if exists(select 1 from public.membership_requests) then raise exception 'Member can read requests'; end if;
 if exists(select 1 from public.role_change_audit) then raise exception 'Member can read role audit'; end if;
 begin
   perform public.review_membership_request((select id from public.membership_requests where status='pending' limit 1), true);
   raise exception 'Member review succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.change_profile_role(auth.uid(),'diretor');
   raise exception 'Member role change succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;

set request.jwt.claim.sub='10000000-0000-0000-0000-000000000002';
do $$ declare audit_before integer; begin
 if not public.is_admin() or not public.is_learning_staff() then raise exception 'Director not admin'; end if;
 if (select count(*) from public.membership_requests where status='pending') <> 1 then raise exception 'Director cannot review queue'; end if;
 select count(*) into audit_before from public.role_change_audit;
 begin
   perform public.change_profile_role('10000000-0000-0000-0000-000000000001','diretor');
   raise exception 'Pending external was promoted';
 exception when check_violation then null; end;
 begin
   perform public.change_profile_role('10000000-0000-0000-0000-000000000005','diretor');
   raise exception 'External was promoted to director';
 exception when insufficient_privilege then null; end;
 begin
   perform public.change_profile_role('10000000-0000-0000-0000-000000000005','coordenador');
   raise exception 'External was promoted to coordinator';
 exception when insufficient_privilege then null; end;
 begin
   perform public.change_profile_role('10000000-0000-0000-0000-000000000005','membro');
   raise exception 'Membership was bypassed';
 exception when insufficient_privilege then null; end;
 begin
   perform public.change_profile_role(gen_random_uuid(),'membro');
   raise exception 'Missing profile role changed';
 exception when no_data_found then null; end;
 begin
   perform public.change_profile_role('10000000-0000-0000-0000-000000000006','admin');
   raise exception 'Invalid role accepted';
 exception when invalid_parameter_value then null; end;
 if (select count(*) from public.role_change_audit) <> audit_before then
   raise exception 'Rejected role change left an audit row'; end if;
end $$;
select public.review_membership_request((select id from public.membership_requests where status='pending' limit 1), true);
select public.change_profile_role('10000000-0000-0000-0000-000000000006','coordenador');
do $$ begin
 if (select role='membro' and status_membro='approved' from public.profiles where email='external@test') is not true then
   raise exception 'Approval was not atomic';
 end if;
 if (select team='Existing team' and bio='Existing biography' and github='https://github.com/existing' and affiliation='CIn-UFPE'
     from public.profiles where email='external@test') is not true then
   raise exception 'Approval erased an omitted optional profile field';
 end if;
 if (select role='coordenador' and status_membro='approved' and category='professor'
     from public.profiles where email='professor@test') is not true then
   raise exception 'Professor coordinator assignment changed membership status or category';
 end if;
 if (select old_role='externo' and new_role='membro' and changed_by=auth.uid() and changed_at is not null
     from public.role_change_audit where target_profile_id='10000000-0000-0000-0000-000000000001' limit 1) is not true then
   raise exception 'Membership approval audit missing';
 end if;
 if (select old_role='membro' and new_role='coordenador' and changed_by=auth.uid() and changed_at is not null
     from public.role_change_audit where target_profile_id='10000000-0000-0000-0000-000000000006' and changed_by=auth.uid() limit 1) is not true then
   raise exception 'Administrative role audit missing';
 end if;
 begin
   perform public.change_profile_role(auth.uid(),'externo');
   raise exception 'Administrator changed own role';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.change_profile_role('10000000-0000-0000-0000-000000000003','externo');
   raise exception 'Administrator was changed directly to External';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.change_profile_role('10000000-0000-0000-0000-000000000004','externo');
   raise exception 'Member was changed directly to External';
 exception when insufficient_privilege then null;
 end;
end $$;
select public.change_profile_role('10000000-0000-0000-0000-000000000004','diretor');
select public.change_profile_role('10000000-0000-0000-0000-000000000004','coordenador');
select public.change_profile_role('10000000-0000-0000-0000-000000000004','membro');
select public.change_profile_role('10000000-0000-0000-0000-000000000004','coordenador');
select public.change_profile_role('10000000-0000-0000-0000-000000000004','diretor');
select public.change_profile_role('10000000-0000-0000-0000-000000000004','membro');
do $$ begin
 if (select count(*) from public.role_change_audit where target_profile_id='10000000-0000-0000-0000-000000000004'
   and changed_by=auth.uid()) <> 6 then raise exception 'Expected six audited role transitions'; end if;
 if (select status_membro from public.profiles where email='member@test') <> 'approved' then
   raise exception 'Role transition lost approved membership status'; end if;
end $$;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
do $$ begin
 if not public.is_member_or_admin() then raise exception 'Approved user cannot access internal area with existing session'; end if;
end $$;

set request.jwt.claim.sub='10000000-0000-0000-0000-000000000005';
select public.submit_membership_request('{"name":"Rejected Student","discipline":"CV","affiliation":"CIn-UFPE"}'::jsonb);
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000003';
do $$ begin
 if not public.is_admin() or not public.is_learning_staff() then raise exception 'Coordinator not admin'; end if;
end $$;
select public.review_membership_request((select id from public.membership_requests where status='pending' limit 1), false);
do $$ begin
 if (select role='externo' and status_membro='rejected' from public.profiles where email='rejected@test') is not true then
   raise exception 'Rejection changed role';
 end if;
 if exists (select 1 from public.role_change_audit where target_profile_id='10000000-0000-0000-0000-000000000005') then
   raise exception 'Rejection created a role audit'; end if;
end $$;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000005';
select public.submit_membership_request('{"name":"Rejected Student","discipline":"CV","affiliation":"CIn-UFPE"}'::jsonb);
do $$ begin
 if (select count(*) from public.membership_requests where profile_id=auth.uid()) <> 2 then
   raise exception 'Rejected applicant could not resubmit'; end if;
 if (select role='externo' and status_membro='pending' from public.profiles where id=auth.uid()) is not true then
   raise exception 'Resubmitted applicant state is wrong'; end if;
end $$;
reset role;
