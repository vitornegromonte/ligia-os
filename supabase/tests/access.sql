-- Uses real PostgreSQL grants/RLS, under application roles and controlled JWT subjects.
select test_assert((select role='visitante' from profiles where email='missing@test'),'missing profile backfilled as visitor');
select test_assert((select role='admin' from profiles where email='admin@test'),'idempotency preserves existing admin');
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000005','forged@test','{"name":"Forged","role":"admin","category":"diretor","director_role":"Executivo","team":"NLP"}');
select test_assert((select role='visitante' and category='membro' and director_role='' and team='NLP' from profiles where email='forged@test'),'trusted trigger ignores authorization metadata');
select private.provision_profile('00000000-0000-0000-0000-000000000005');
select test_assert((select count(*)=1 from profiles where email='forged@test'),'provisioning is idempotent');
update auth.users set email='updated@test' where id='00000000-0000-0000-0000-000000000005';
select test_assert((select email='updated@test' from profiles where id='00000000-0000-0000-0000-000000000005'),'Auth email stays authoritative');

set role anon;
select test_denied('select * from profiles');
select test_denied($q$select change_profile_role('00000000-0000-0000-0000-000000000001','admin')$q$);
select test_assert((select count(*)=0 from projects),'anonymous internal read denied');
select test_assert((select count(*)=1 from events),'anonymous public event read');
reset role;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select test_assert((select count(*)=1 from profiles),'visitor reads only self');
update profiles set name='Edited' where id=auth.uid();
select test_assert((select name='Edited' from profiles where id=auth.uid()),'visitor can edit ordinary fields');
select test_denied($q$update profiles set role='admin' where id=auth.uid()$q$);
select test_denied($q$update profiles set email='spoof@test' where id=auth.uid()$q$);
select test_denied($q$update profiles set category='diretor' where id=auth.uid()$q$);
select test_denied($q$insert into profiles(id,name,role) values(auth.uid(),'Injected','admin') on conflict(id) do update set role='admin'$q$);
select test_denied($q$delete from profiles where id=auth.uid()$q$);
select test_denied($q$select private.provision_profile(auth.uid())$q$);
select test_denied($q$select change_profile_role(auth.uid(),'admin')$q$);
select test_assert((select count(*)=1 from events),'visitor reads only public events');
select test_denied($q$insert into events values(3,'public','Forged')$q$);
do $$ declare tbl text; n int;
begin
  foreach tbl in array array['projects','project_members','milestones','milestone_members','tasks','notes','project_docs','guides','research_docs','notifications','event_participants','challenges','submissions'] loop
    execute format('select count(*) from public.%I',tbl) into n;
    perform test_assert(n=0,'visitor cannot read '||tbl);
    perform test_denied(format('insert into public.%I(id,title) values(9,''Forged'')',tbl));
    execute format('update public.%I set title=''Forged'' where id=1',tbl);
    get diagnostics n = row_count;
    perform test_assert(n=0,'visitor cannot update '||tbl);
    execute format('delete from public.%I where id=1',tbl);
    get diagnostics n = row_count;
    perform test_assert(n=0,'visitor cannot delete '||tbl);
  end loop;
end $$;

set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test_assert((select count(*)=2 from profiles),'member sees internal profiles only');
select test_assert((select count(*)=1 from projects),'member internal read preserved');
select test_assert((select count(*)=2 from events),'member internal events preserved');
select test_denied($q$select change_profile_role('00000000-0000-0000-0000-000000000001','admin')$q$);
select test_denied($q$insert into projects(id,title) values(9,'Forged')$q$);
select test_denied($q$insert into guides(id,title) values(9,'Forged')$q$);
select test_denied($q$update profiles set role='admin' where id=auth.uid()$q$);
do $$ declare n int;
begin
 update profiles set name='Unauthorized' where id='00000000-0000-0000-0000-000000000003';
 get diagnostics n = row_count;
 perform test_assert(n=0,'member cannot edit another profile');
end $$;

set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select test_assert((select count(*)=5 from profiles),'admin sees visitors and members');
select test_denied($q$select change_profile_role(auth.uid(),'visitante')$q$);
select test_denied($q$update profiles set role='membro' where id='00000000-0000-0000-0000-000000000001'$q$);
select change_profile_role('00000000-0000-0000-0000-000000000001','membro');
select test_assert((select role='membro' from profiles where id='00000000-0000-0000-0000-000000000001'),'admin RPC persists role');
update profiles set category='professor' where id='00000000-0000-0000-0000-000000000001';
insert into projects(id,title) values(9,'Admin created');
select change_profile_role('00000000-0000-0000-0000-000000000001','visitante');
-- Reusing the same JWT subject after demotion must reflect current database role.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select test_assert((select count(*)=0 from projects),'demotion applies without refreshing JWT');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000099';
select test_assert((select count(*)=0 from projects),'missing profile denies access');
select test_assert((select count(*)=0 from profiles),'missing profile sees no directory');
reset role;
select test_assert((select count(*)=2 from projects),'denied visitor writes had no effect');
