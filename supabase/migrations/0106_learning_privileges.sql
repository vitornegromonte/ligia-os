-- Explicit grants: hosted Supabase defaults otherwise grant ALL to API roles.
do $$ declare t text;
begin
  foreach t in array array['student_progress','pretest_results','learning_events','loop_results','learner_profiles','nivelamento_rascunhos'] loop
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
revoke all on public.rate_limits from public,anon,authenticated;
grant all on public.rate_limits to service_role;
revoke all on public.export_student_v1,public.minhas_praticas_codigo from public,anon;
grant select on public.export_student_v1,public.minhas_praticas_codigo to authenticated;
revoke all on function public.consume_rate_limit(uuid,text,int,interval) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(uuid,text,int,interval) to service_role;
alter function public.is_learning_staff() set search_path = '';
