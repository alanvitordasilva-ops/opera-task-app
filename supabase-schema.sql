-- ============================================================================
-- SCRIPT DE BANCO DE DADOS SUPABASE PARA OPERATASK (MULTI-TENANT REAL & RLS)
-- Cole este script no "SQL Editor" do painel do seu projeto Supabase e execute.
-- ============================================================================

-- 1. Habilitar extensão de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Tenants (Empresas / Clientes da plataforma)
CREATE TABLE IF NOT EXISTS public.tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  cnpj_or_doc TEXT,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'basico', 'profissional', 'enterprise', 'starter', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'canceled')),
  payment_status TEXT NOT NULL DEFAULT 'trialing' CHECK (payment_status IN ('paid', 'past_due', 'unpaid', 'trialing', 'canceled')),
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT,
  primary_workspace_id TEXT,
  max_users INTEGER DEFAULT 10,
  plan_start_date TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON public.tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_payment ON public.tenants(payment_status);

-- 3. Tabela de Perfis de Usuários (public.profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'membro' CHECK (tipo IN ('master', 'dono', 'administrador', 'producao', 'membro', 'visualizador')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_nome ON public.profiles(nome);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);

-- 4. Tabela de Espaços de Trabalho (workspaces)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  logo_color TEXT DEFAULT '#173653',
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant ON public.workspaces(tenant_id);

-- 5. Tabela de Membros dos Espaços de Trabalho (workspace_members)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'membro',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);

-- 6. Tabela de Projetos / Quadros (projects)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
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
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);

-- 7. Tabela de Cards / Tarefas (cards & tasks)
CREATE TABLE IF NOT EXISTS public.cards (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
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
  ficha_tecnica JSONB DEFAULT NULL,
  production_records JSONB DEFAULT '[]'::jsonb,
  frame_color TEXT,
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
CREATE INDEX IF NOT EXISTS idx_cards_tenant ON public.cards(tenant_id);

-- Tabela de tarefas compatibilidade
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  workspace_id TEXT,
  project_id TEXT,
  column_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'none',
  assignee_ids JSONB DEFAULT '[]'::jsonb,
  due_date TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  activities JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  ficha_tecnica JSONB DEFAULT NULL,
  production_records JSONB DEFAULT '[]'::jsonb,
  frame_color TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON public.tasks(tenant_id);

-- 8. Tabela de Fichas Técnicas
CREATE TABLE IF NOT EXISTS public.fichas_tecnicas (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT NOT NULL,
  workspace_id TEXT,
  project_id TEXT,
  card_id TEXT,
  codigo TEXT,
  descricao TEXT,
  unidade_medida TEXT,
  setor_producao TEXT,
  tempo_estimado_minutos NUMERIC,
  materiais JSONB DEFAULT '[]'::jsonb,
  etapas JSONB DEFAULT '[]'::jsonb,
  instrucoes_seguranca TEXT,
  controle_qualidade TEXT,
  custo_total_estimado NUMERIC,
  historico_revisoes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fichas_tenant ON public.fichas_tecnicas(tenant_id);

-- 9. Tabela de Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Garantir colunas de Tenant nas tabelas existentes se já criadas
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.fichas_tecnicas ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- 10. Funções Auxiliares de Multi-Tenant e Governança Master
CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS boolean AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'alanvitordasilva@gmail.com.br' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND tipo = 'master'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS text AS $$
DECLARE
  v_tenant_id text;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Políticas Estritas de Isolamento Multi-Tenant (Row Level Security - RLS)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Políticas para TENANTS
DROP POLICY IF EXISTS "Tenants isolation policy" ON public.tenants;
CREATE POLICY "Tenants isolation policy"
  ON public.tenants FOR ALL
  USING (
    public.is_master_user() OR
    id = public.get_auth_tenant_id() OR
    owner_id = auth.uid()::text
  )
  WITH CHECK (
    public.is_master_user() OR
    id = public.get_auth_tenant_id() OR
    owner_id = auth.uid()::text
  );

-- Políticas para PROFILES
DROP POLICY IF EXISTS "Profiles isolation policy" ON public.profiles;
CREATE POLICY "Profiles isolation policy"
  ON public.profiles FOR ALL
  USING (
    public.is_master_user() OR
    id = auth.uid() OR
    tenant_id = public.get_auth_tenant_id()
  )
  WITH CHECK (
    public.is_master_user() OR
    id = auth.uid() OR
    tenant_id = public.get_auth_tenant_id()
  );

-- Políticas para WORKSPACES
DROP POLICY IF EXISTS "Workspaces isolation policy" ON public.workspaces;
CREATE POLICY "Workspaces isolation policy"
  ON public.workspaces FOR ALL
  USING (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    owner_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = public.workspaces.id AND user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    owner_id = auth.uid()::text
  );

-- Políticas para WORKSPACE_MEMBERS
DROP POLICY IF EXISTS "Workspace members isolation policy" ON public.workspace_members;
CREATE POLICY "Workspace members isolation policy"
  ON public.workspace_members FOR ALL
  USING (
    public.is_master_user() OR
    user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.workspace_members.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    public.is_master_user() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.workspace_members.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
    )
  );

-- Políticas para CARDS e TASKS (Isolamento total por Tenant e Workspace)
DROP POLICY IF EXISTS "Cards isolation policy" ON public.cards;
CREATE POLICY "Cards isolation policy"
  ON public.cards FOR ALL
  USING (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.cards.workspace_id AND wm.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.cards.workspace_id AND wm.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Tasks isolation policy" ON public.tasks;
CREATE POLICY "Tasks isolation policy"
  ON public.tasks FOR ALL
  USING (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.tasks.workspace_id AND wm.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.tasks.workspace_id AND wm.user_id = auth.uid()::text
    )
  );

-- 12. Inserir Tenant Matriz e Workspace Padrão
INSERT INTO public.tenants (id, name, legal_name, plan, status, payment_status, owner_id, owner_name, owner_email, max_users)
VALUES ('tenant-matriz', 'OperaTask Matriz', 'OperaTask Tecnologia Ltda', 'enterprise', 'active', 'paid', 'user-master-alan', 'Alan Silva (Master)', 'alanvitordasilva@gmail.com.br', 9999)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspaces (id, tenant_id, name, slug, description, logo_color, owner_id)
VALUES ('ws-principal', 'tenant-matriz', 'Meu Workspace', 'meu-workspace', 'Espaço de trabalho corporativo', '#173653', 'user-master-alan')
ON CONFLICT (id) DO NOTHING;

