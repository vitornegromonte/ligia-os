-- Disposable cluster only. The prior auth test left user 2 as visitor.
insert into public.challenges(id,slug,title,difficulty,function_name)
values('20000000-0000-0000-0000-000000000001','synthetic','Synthetic','Easy','run');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test_assert((select count(*)=1 from challenges),'visitor reads learning catalog');
insert into student_progress(user_id,node_id,status) values(auth.uid(),'synthetic','done');
select test_assert((select count(*)=1 from student_progress),'own progress visible');
select test_denied($q$insert into student_progress(user_id,node_id,status) values('00000000-0000-0000-0000-000000000004','forged','done')$q$);
select test_denied($q$insert into submissions(challenge_id,profile_id,code,status) values('20000000-0000-0000-0000-000000000001',auth.uid(),'','passed')$q$);
select test_denied($q$select consume_rate_limit(auth.uid(),'judge',2,'1 hour')$q$);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select test_assert((select count(*)=0 from student_progress),'second visitor cannot read first progress');
reset role;
set request.jwt.claim.sub='';
set role service_role;
select test_assert(auth.uid() is null,'service request has no user JWT');
select test_assert(consume_rate_limit('00000000-0000-0000-0000-000000000002','judge',2,'1 hour'),'first service call allowed');
select test_assert(consume_rate_limit('00000000-0000-0000-0000-000000000002','judge',2,'1 hour'),'second service call allowed');
select test_assert(not consume_rate_limit('00000000-0000-0000-0000-000000000002','judge',2,'1 hour'),'third service call denied');
select test_assert(consume_rate_limit('00000000-0000-0000-0000-000000000004','judge',2,'1 hour'),'another user has separate budget');
insert into submissions(challenge_id,profile_id,code,status,passed,total)
values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','','passed',1,1);
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test_assert((select resolvido from minhas_praticas_codigo where slug='synthetic'),'server result contributes to own progress');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select test_assert((select count(*)=0 from submissions),'another visitor cannot read result');
reset role;
