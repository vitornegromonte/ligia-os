-- PROPOSAL. Adds a restrictive global boundary, NOT a complete row ownership model.
-- Existing permissive policies are still required to allow members/admins access.
begin;
do $$ declare tbl text;
begin
  foreach tbl in array array['projects','project_members','milestones','milestone_members','tasks','notes','project_docs','guides','research_docs','notifications','event_participants','challenges','submissions'] loop
    if to_regclass(format('public.%I',tbl)) is null then raise exception 'Missing table %, inspect real schema first',tbl; end if;
    execute format('alter table public.%I enable row level security',tbl);
    execute format('drop policy if exists ligia_internal_boundary on public.%I',tbl);
    execute format('create policy ligia_internal_boundary on public.%I as restrictive for all to public using ((select private.current_global_role()) in (''membro'',''admin'')) with check ((select private.current_global_role()) in (''membro'',''admin''))',tbl);
  end loop;
end $$;

-- Public events are intentional. Public READ does not imply public WRITE.
alter table public.events enable row level security;
drop policy if exists ligia_events_read_boundary on public.events;
create policy ligia_events_read_boundary on public.events as restrictive for select to public
using (visibility='public' or (select private.current_global_role()) in ('membro','admin'));
do $$ declare op text;
begin
  foreach op in array array['insert','update','delete'] loop
    execute format('drop policy if exists %I on public.events','ligia_events_'||op||'_boundary');
    execute format('create policy %I on public.events as restrictive for %s to public %s %s',
      'ligia_events_'||op||'_boundary',op,
      case when op <> 'insert' then 'using ((select private.current_global_role()) in (''membro'',''admin''))' else '' end,
      case when op <> 'delete' then 'with check ((select private.current_global_role()) in (''membro'',''admin''))' else '' end);
  end loop;
end $$;

-- Existing admin operations. Project collaboration rules stay in existing policies.
do $$ declare tbl text; op text;
begin
  foreach tbl in array array['projects','guides','research_docs'] loop
    foreach op in array array['insert','update','delete'] loop
      if tbl='projects' and op='update' then continue; end if;
      execute format('drop policy if exists %I on public.%I','ligia_admin_'||op,tbl);
      execute format('create policy %I on public.%I as restrictive for %s to public %s %s',
        'ligia_admin_'||op,tbl,op,
        case when op <> 'insert' then 'using ((select private.current_global_role()) = ''admin'')' else '' end,
        case when op <> 'delete' then 'with check ((select private.current_global_role()) = ''admin'')' else '' end);
    end loop;
  end loop;
end $$;
commit;
