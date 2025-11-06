-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expression text NOT NULL,
  date date NOT NULL,
  workspace_id bigint NOT NULL,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
CREATE TABLE public.reminders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  start timestamp with time zone NOT NULL,
  end timestamp with time zone NOT NULL,
  summary text,
  expression text,
  user_id uuid NOT NULL,
  workspace_id bigint NOT NULL,
  google_event_id text,
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminder_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reminder_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
CREATE TABLE public.routines (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id bigint NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  title text NOT NULL,
  summary text,
  expression text,
  start_at time without time zone NOT NULL,
  end_at time without time zone,
  repeat_days ARRAY NOT NULL DEFAULT '{}'::integer[],
  is_active boolean DEFAULT true,
  CONSTRAINT routines_pkey PRIMARY KEY (id),
  CONSTRAINT routines_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT routines_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sods (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  workspace_id bigint,
  date date NOT NULL,
  start_at time without time zone,
  summary text,
  expression text,
  check boolean DEFAULT false,
  user_id uuid NOT NULL,
  end_at time without time zone,
  routine_id uuid,
  CONSTRAINT sods_pkey PRIMARY KEY (id),
  CONSTRAINT sods_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT sods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT sods_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES public.routines(id)
);
CREATE TABLE public.todos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_pinned boolean DEFAULT false,
  pinned_at timestamp without time zone,
  upped_at timestamp without time zone,
  summary text,
  expression text,
  workspace_id bigint NOT NULL,
  user_id uuid,
  completed boolean DEFAULT false,
  sod_id bigint,
  CONSTRAINT todos_pkey PRIMARY KEY (id),
  CONSTRAINT todos_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT todos_sod_id_fkey FOREIGN KEY (sod_id) REFERENCES public.sods(id)
);
CREATE TABLE public.user (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL UNIQUE,
  CONSTRAINT user_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workspaces (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  title text DEFAULT '빈 워크스페이스'::text,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);