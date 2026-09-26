-- Schema-only baseline captured before the authentication and learning migrations.
-- Contains legacy application DDL, grants and RLS, but no user data.
-- On the existing production project, verify equivalence and mark this version
-- applied with migration repair; never execute it against populated tables.
do $$ begin
  if to_regclass('public.profiles') is not null then
    raise exception 'Legacy schema exists; verify and repair migration history instead';
  end if;
end $$;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: can_access_project(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_project(project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $_$
  select public.is_admin() or public.is_project_member($1);
$_$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select role from public.profiles where id = auth.uid();
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, name, email, role, team, affiliation, lattes, github, linkedin, kaggle, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'visitante',
    new.raw_user_meta_data->>'team',
    new.raw_user_meta_data->>'affiliation',
    new.raw_user_meta_data->>'lattes',
    new.raw_user_meta_data->>'github',
    new.raw_user_meta_data->>'linkedin',
    new.raw_user_meta_data->>'kaggle',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


--
-- Name: is_member_or_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_member_or_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'membro')
  );
$$;


--
-- Name: is_project_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_project_member(project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $_$
  select exists (
    select 1 from public.project_members
    where project_id = $1 and profile_id = auth.uid()
  );
$_$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    event_name text NOT NULL,
    event_date date,
    hours integer,
    certificate_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_participants (
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    all_day boolean DEFAULT false,
    location text DEFAULT ''::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    visibility text DEFAULT 'internal'::text NOT NULL,
    image_url text DEFAULT ''::text,
    CONSTRAINT events_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'internal'::text])))
);


--
-- Name: guides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guides (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    icon text DEFAULT 'BookOpen'::text NOT NULL,
    category text,
    updated text,
    read_time text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: initiatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.initiatives (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    team text DEFAULT ''::text,
    description text DEFAULT ''::text,
    image_url text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: milestone_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_members (
    milestone_id uuid NOT NULL,
    profile_id uuid NOT NULL
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'todo'::text,
    created_at timestamp with time zone DEFAULT now(),
    description text DEFAULT ''::text,
    due_date date,
    CONSTRAINT milestones_status_check CHECK ((status = ANY (ARRAY['backlog'::text, 'todo'::text, 'in_progress'::text, 'done'::text])))
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    title text DEFAULT ''::text,
    content text DEFAULT ''::text,
    type text DEFAULT 'quick'::text,
    pinned boolean DEFAULT false,
    event_id uuid,
    participants text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notes_type_check CHECK ((type = ANY (ARRAY['quick'::text, 'meeting'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    type text DEFAULT 'info'::text,
    title text NOT NULL,
    body text DEFAULT ''::text,
    link text DEFAULT ''::text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    initials text,
    email text,
    role text DEFAULT 'visitante'::text NOT NULL,
    team text,
    discipline text,
    skills text[] DEFAULT '{}'::text[],
    affiliation text,
    bio text DEFAULT ''::text,
    color text DEFAULT '#b7c2d2'::text,
    avatar_url text,
    lattes text,
    github text,
    linkedin text,
    kaggle text,
    created_at timestamp with time zone DEFAULT now(),
    project text,
    capacity text,
    research_interests text,
    cv text,
    history jsonb DEFAULT '[]'::jsonb,
    calendar_url text DEFAULT ''::text,
    resume_text text DEFAULT ''::text,
    category text DEFAULT 'membro'::text,
    director_role text DEFAULT ''::text,
    CONSTRAINT profiles_category_check CHECK ((category = ANY (ARRAY['professor'::text, 'diretor'::text, 'membro'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'membro'::text, 'visitante'::text])))
);


--
-- Name: project_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_docs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    category text,
    content text,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    icon text DEFAULT 'FileText'::text
);


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    profile_id uuid NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'Em andamento'::text,
    color text DEFAULT '#6b8eb3'::text,
    progress integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    icon text DEFAULT 'sparkles'::text,
    deadline text,
    team text DEFAULT ''::text,
    image_url text DEFAULT ''::text
);


--
-- Name: research_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_docs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    icon text DEFAULT 'Microscope'::text NOT NULL,
    area text,
    updated text,
    read_time text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    status text DEFAULT 'todo'::text,
    priority text DEFAULT 'medium'::text,
    due_date date,
    project_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['backlog'::text, 'todo'::text, 'in_progress'::text, 'done'::text, 'canceled'::text])))
);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (event_id, profile_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: guides guides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_pkey PRIMARY KEY (id);


--
-- Name: initiatives initiatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT initiatives_pkey PRIMARY KEY (id);


--
-- Name: milestone_members milestone_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_members
    ADD CONSTRAINT milestone_members_pkey PRIMARY KEY (milestone_id, profile_id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_docs project_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_docs
    ADD CONSTRAINT project_docs_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, profile_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: research_docs research_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_docs
    ADD CONSTRAINT research_docs_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: milestone_members milestone_members_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_members
    ADD CONSTRAINT milestone_members_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;


--
-- Name: milestone_members milestone_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_members
    ADD CONSTRAINT milestone_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notes notes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: notes notes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_docs project_docs_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_docs
    ADD CONSTRAINT project_docs_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);


--
-- Name: project_docs project_docs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_docs
    ADD CONSTRAINT project_docs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: tasks tasks_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: project_docs Admin atualiza docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin atualiza docs" ON public.project_docs FOR UPDATE USING (public.is_admin());


--
-- Name: milestones Admin atualiza milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin atualiza milestones" ON public.milestones FOR UPDATE USING (public.is_admin());


--
-- Name: projects Admin atualiza projetos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin atualiza projetos" ON public.projects FOR UPDATE USING (public.is_admin());


--
-- Name: project_docs Admin deleta docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin deleta docs" ON public.project_docs FOR DELETE USING (public.is_admin());


--
-- Name: milestones Admin deleta milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin deleta milestones" ON public.milestones FOR DELETE USING (public.is_admin());


--
-- Name: notifications Admin deleta notificações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin deleta notificações" ON public.notifications FOR DELETE USING (public.is_admin());


--
-- Name: projects Admin deleta projetos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin deleta projetos" ON public.projects FOR DELETE USING (public.is_admin());


--
-- Name: project_members Admin gerencia project_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia project_members" ON public.project_members USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: project_docs Admin insere docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insere docs" ON public.project_docs FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: milestone_members Admin insere milestone_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insere milestone_members" ON public.milestone_members FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: milestones Admin insere milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insere milestones" ON public.milestones FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: projects Admin insere projetos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insere projetos" ON public.projects FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: milestone_members Admin remove membros de milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin remove membros de milestones" ON public.milestone_members FOR DELETE USING (public.is_admin());


--
-- Name: guides Admin tudo em guides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin tudo em guides" ON public.guides USING (public.is_admin());


--
-- Name: initiatives Admin tudo em iniciativas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin tudo em iniciativas" ON public.initiatives USING (public.is_admin());


--
-- Name: profiles Admin tudo em profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin tudo em profiles" ON public.profiles USING (public.is_admin());


--
-- Name: research_docs Admin tudo em research_docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin tudo em research_docs" ON public.research_docs USING (public.is_admin());


--
-- Name: project_docs Admin vê todos os docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin vê todos os docs" ON public.project_docs FOR SELECT USING (public.is_admin());


--
-- Name: milestones Admin vê todos os milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin vê todos os milestones" ON public.milestones FOR SELECT USING (public.is_admin());


--
-- Name: projects Admin vê todos os projetos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin vê todos os projetos" ON public.projects FOR SELECT USING (public.is_admin());


--
-- Name: notes Dono atualiza notas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono atualiza notas" ON public.notes FOR UPDATE USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: tasks Dono atualiza tarefas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono atualiza tarefas" ON public.tasks FOR UPDATE USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: notes Dono cria notas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono cria notas" ON public.notes FOR INSERT WITH CHECK (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: tasks Dono cria tarefas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono cria tarefas" ON public.tasks FOR INSERT WITH CHECK (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: notes Dono deleta notas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono deleta notas" ON public.notes FOR DELETE USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: tasks Dono deleta tarefas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono deleta tarefas" ON public.tasks FOR DELETE USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: notes Dono vê suas notas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono vê suas notas" ON public.notes FOR SELECT USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: tasks Dono vê suas tarefas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Dono vê suas tarefas" ON public.tasks FOR SELECT USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: certificates Inserir próprio certificado; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Inserir próprio certificado" ON public.certificates FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: initiatives Leitura publica de iniciativas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura publica de iniciativas" ON public.initiatives FOR SELECT USING (true);


--
-- Name: guides Leitura pública de guides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de guides" ON public.guides FOR SELECT USING (true);


--
-- Name: projects Leitura pública de projetos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de projetos" ON public.projects FOR SELECT USING (true);


--
-- Name: research_docs Leitura pública de research_docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública de research_docs" ON public.research_docs FOR SELECT USING (true);


--
-- Name: milestone_members Leitura pública milestone_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública milestone_members" ON public.milestone_members FOR SELECT USING (true);


--
-- Name: project_members Leitura pública project_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leitura pública project_members" ON public.project_members FOR SELECT USING (true);


--
-- Name: certificates Ler próprios certificados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Ler próprios certificados" ON public.certificates FOR SELECT USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: project_members Membro adiciona membros no projeto; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro adiciona membros no projeto" ON public.project_members FOR INSERT WITH CHECK (public.is_project_member(project_id));


--
-- Name: milestone_members Membro aloca membros em marcos do projeto; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro aloca membros em marcos do projeto" ON public.milestone_members FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.milestones ms
  WHERE ((ms.id = milestone_members.milestone_id) AND public.is_project_member(ms.project_id)))));


--
-- Name: project_docs Membro atualiza docs em projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro atualiza docs em projetos alocados" ON public.project_docs FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = project_docs.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: milestones Membro atualiza milestones em projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro atualiza milestones em projetos alocados" ON public.milestones FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = milestones.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: project_docs Membro deleta docs em projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro deleta docs em projetos alocados" ON public.project_docs FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = project_docs.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: milestones Membro deleta milestones em projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro deleta milestones em projetos alocados" ON public.milestones FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = milestones.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: profiles Membro edita próprio profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro edita próprio profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (role = public.get_my_role())));


--
-- Name: project_docs Membro insere docs em projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro insere docs em projetos alocados" ON public.project_docs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = project_docs.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: milestones Membro insere milestones em projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro insere milestones em projetos alocados" ON public.milestones FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = milestones.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: milestone_members Membro remove membros de milestones alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro remove membros de milestones alocados" ON public.milestone_members FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.milestones ms
     JOIN public.project_members pm ON ((pm.project_id = ms.project_id)))
  WHERE ((ms.id = milestone_members.milestone_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: project_members Membro remove membros do projeto; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro remove membros do projeto" ON public.project_members FOR DELETE USING (public.is_project_member(project_id));


--
-- Name: project_docs Membro vê docs dos projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro vê docs dos projetos alocados" ON public.project_docs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = project_docs.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: milestones Membro vê milestones dos projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro vê milestones dos projetos alocados" ON public.milestones FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = milestones.project_id) AND (pm.profile_id = auth.uid())))));


--
-- Name: projects Membro vê projetos alocados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro vê projetos alocados" ON public.projects FOR SELECT USING (public.is_project_member(id));


--
-- Name: events Membros atualizam eventos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membros atualizam eventos" ON public.events FOR UPDATE USING (public.is_member_or_admin());


--
-- Name: events Membros criam eventos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membros criam eventos" ON public.events FOR INSERT WITH CHECK (public.is_member_or_admin());


--
-- Name: notifications Membros criam notificações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membros criam notificações" ON public.notifications FOR INSERT WITH CHECK ((public.is_member_or_admin() OR public.is_admin()));


--
-- Name: events Membros deletam eventos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membros deletam eventos" ON public.events FOR DELETE USING (public.is_member_or_admin());


--
-- Name: event_participants Membros gerenciam participantes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membros gerenciam participantes" ON public.event_participants USING (public.is_member_or_admin()) WITH CHECK (public.is_member_or_admin());


--
-- Name: events Todos leem eventos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos leem eventos" ON public.events FOR SELECT USING (true);


--
-- Name: event_participants Todos leem participantes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos leem participantes" ON public.event_participants FOR SELECT USING (true);


--
-- Name: profiles Todos leem profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos leem profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: notifications Usuário atualiza suas notificações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuário atualiza suas notificações" ON public.notifications FOR UPDATE USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: notifications Usuário lê suas notificações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuário lê suas notificações" ON public.notifications FOR SELECT USING (((auth.uid() = profile_id) OR public.is_admin()));


--
-- Name: certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: event_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: guides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

--
-- Name: initiatives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

--
-- Name: milestone_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestone_members ENABLE ROW LEVEL SECURITY;

--
-- Name: milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_docs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_docs ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: research_docs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_docs ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION can_access_project(project_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_access_project(project_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_access_project(project_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_access_project(project_id uuid) TO service_role;


--
-- Name: FUNCTION get_my_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_my_role() TO anon;
GRANT ALL ON FUNCTION public.get_my_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_role() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_member_or_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_member_or_admin() TO anon;
GRANT ALL ON FUNCTION public.is_member_or_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_member_or_admin() TO service_role;


--
-- Name: FUNCTION is_project_member(project_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_project_member(project_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_project_member(project_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_project_member(project_id uuid) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: TABLE certificates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.certificates TO anon;
GRANT ALL ON TABLE public.certificates TO authenticated;
GRANT ALL ON TABLE public.certificates TO service_role;


--
-- Name: TABLE event_participants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_participants TO anon;
GRANT ALL ON TABLE public.event_participants TO authenticated;
GRANT ALL ON TABLE public.event_participants TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: TABLE guides; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.guides TO anon;
GRANT ALL ON TABLE public.guides TO authenticated;
GRANT ALL ON TABLE public.guides TO service_role;


--
-- Name: TABLE initiatives; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.initiatives TO anon;
GRANT ALL ON TABLE public.initiatives TO authenticated;
GRANT ALL ON TABLE public.initiatives TO service_role;


--
-- Name: TABLE milestone_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.milestone_members TO anon;
GRANT ALL ON TABLE public.milestone_members TO authenticated;
GRANT ALL ON TABLE public.milestone_members TO service_role;


--
-- Name: TABLE milestones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.milestones TO anon;
GRANT ALL ON TABLE public.milestones TO authenticated;
GRANT ALL ON TABLE public.milestones TO service_role;


--
-- Name: TABLE notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notes TO anon;
GRANT ALL ON TABLE public.notes TO authenticated;
GRANT ALL ON TABLE public.notes TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE project_docs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_docs TO anon;
GRANT ALL ON TABLE public.project_docs TO authenticated;
GRANT ALL ON TABLE public.project_docs TO service_role;


--
-- Name: TABLE project_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_members TO anon;
GRANT ALL ON TABLE public.project_members TO authenticated;
GRANT ALL ON TABLE public.project_members TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: TABLE research_docs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_docs TO anon;
GRANT ALL ON TABLE public.research_docs TO authenticated;
GRANT ALL ON TABLE public.research_docs TO service_role;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tasks TO anon;
GRANT ALL ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.tasks TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

-- App-owned signup trigger lives on auth.users, outside the public dump.
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
