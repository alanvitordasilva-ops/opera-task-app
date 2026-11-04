-- ============================================================================
-- SCRIPT DE BANCO DE DADOS SUPABASE PARA OPERATASK (MULTI-USUÁRIO REAL)
-- Cole este script no "SQL Editor" do painel do seu projeto Supabase e execute.
-- ============================================================================

-- 1. Habilitar extensão de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (public.profiles)
-- Vinculada diretamente a auth.users via UUID
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'membro' CHECK (tipo IN ('master', 'dono', 'administrador', 'producao', 'membro', 'visualizador')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida de perfil por email e nome
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_nome ON public.profiles(nome);

-- 3. Tabela de Espaços de Trabalho (workspaces)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  logo_color TEXT DEFAULT '#173653',
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Membros dos Espaços de Trabalho (workspace_members)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'membro',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);

-- 5. Tabela de Projetos / Quadros (projects)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#2563eb',
  icon TEXT DEFAULT 'folder',
  columns JSONB DEFAULT '[]'::jsonb,
  member_ids JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);

-- 6. Tabela de Cards / Tarefas (cards & tasks)
CREATE TABLE IF NOT EXISTS public.cards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  assignee_ids JSONB DEFAULT '[]'::jsonb,
  due_date TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  activities JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_project ON public.cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_workspace ON public.cards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cards_column_order ON public.cards(column_id, order_index);

-- Tabela de tarefas legada / compatibilidade
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  project_id TEXT,
  column_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  assignee_ids JSONB DEFAULT '[]'::jsonb,
  due_date TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  activities JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- 7. Gatilho (Trigger) para Criação Automática de Perfil após cadastro em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, tipo, avatar_url, created_at)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    COALESCE(new.raw_user_meta_data->>'tipo', 'membro'),
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'avatarColor',
      '#34B1AC'
    ),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    tipo = EXCLUDED.tipo,
    avatar_url = EXCLUDED.avatar_url;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their profile or admins" ON public.profiles;
CREATE POLICY "Users can update their profile or admins"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Políticas para WORKSPACES
DROP POLICY IF EXISTS "Workspaces select policy" ON public.workspaces;
CREATE POLICY "Workspaces select policy"
  ON public.workspaces FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Workspaces all policy" ON public.workspaces;
CREATE POLICY "Workspaces all policy"
  ON public.workspaces FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para WORKSPACE_MEMBERS
DROP POLICY IF EXISTS "Workspace members select policy" ON public.workspace_members;
CREATE POLICY "Workspace members select policy"
  ON public.workspace_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Workspace members all policy" ON public.workspace_members;
CREATE POLICY "Workspace members all policy"
  ON public.workspace_members FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para PROJECTS
DROP POLICY IF EXISTS "Projects all policy" ON public.projects;
CREATE POLICY "Projects all policy"
  ON public.projects FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para CARDS
DROP POLICY IF EXISTS "Cards all policy" ON public.cards;
CREATE POLICY "Cards all policy"
  ON public.cards FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para TASKS
DROP POLICY IF EXISTS "Tasks all policy" ON public.tasks;
CREATE POLICY "Tasks all policy"
  ON public.tasks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para TAGS
DROP POLICY IF EXISTS "Tags all policy" ON public.tags;
CREATE POLICY "Tags all policy"
  ON public.tags FOR ALL
  USING (true)
  WITH CHECK (true);

-- Inserir Workspace Inicial Padrão se não existir
INSERT INTO public.workspaces (id, name, slug, description, logo_color, owner_id)
VALUES ('ws-principal', 'Meu Workspace', 'meu-workspace', 'Espaço de trabalho corporativo', '#173653', 'master')
ON CONFLICT (id) DO NOTHING;
