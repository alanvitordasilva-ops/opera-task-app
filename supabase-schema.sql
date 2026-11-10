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
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'gratuito', 'basico', 'intermediario', 'profissional', 'enterprise', 'starter', 'pro')),
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
    auth.jwt() ->> 'email' = 'alanvitordasilva@gmail.com' OR
    auth.jwt() ->> 'email' ILIKE 'alanvitordasilva@%' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (tipo = 'master' OR email ILIKE 'alanvitordasilva@%')
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

-- Garante colunas de identificação de empresa/workspace no perfil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workspace_id TEXT;

-- 10. Funções Auxiliares de Multi-Tenant e Governança Master
CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS boolean AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'alanvitordasilva@gmail.com.br' OR
    auth.jwt() ->> 'email' = 'alanvitordasilva@gmail.com' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (tipo = 'master' OR email = 'alanvitordasilva@gmail.com.br')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS text AS $$
DECLARE
  v_tenant_id text;
BEGIN
  SELECT COALESCE(tenant_id, company_id) INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil e vincular automaticamente ao workspace ao cadastrar no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id text;
  v_workspace_id text;
BEGIN
  v_tenant_id := COALESCE(new.raw_user_meta_data->>'tenant_id', new.raw_user_meta_data->>'company_id');
  v_workspace_id := new.raw_user_meta_data->>'workspace_id';

  INSERT INTO public.profiles (id, tenant_id, company_id, workspace_id, nome, email, tipo, avatar_url, created_at)
  VALUES (
    new.id,
    v_tenant_id,
    v_tenant_id,
    v_workspace_id,
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
    tenant_id = COALESCE(EXCLUDED.tenant_id, public.profiles.tenant_id),
    company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id),
    workspace_id = COALESCE(EXCLUDED.workspace_id, public.profiles.workspace_id),
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    tipo = EXCLUDED.tipo,
    avatar_url = EXCLUDED.avatar_url;

  -- Se foi passado workspace_id, insere automaticamente em workspace_members
  IF v_workspace_id IS NOT NULL AND v_workspace_id <> '' THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (v_workspace_id, new.id::text, COALESCE(new.raw_user_meta_data->>'tipo', 'membro'), NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
    tenant_id = public.get_auth_tenant_id() OR
    company_id = public.get_auth_tenant_id()
  )
  WITH CHECK (
    public.is_master_user() OR
    id = auth.uid() OR
    tenant_id = public.get_auth_tenant_id() OR
    company_id = public.get_auth_tenant_id()
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
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspaces.id AND wm.user_id = auth.uid()::text
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

-- Políticas para PROJECTS (Quadros / Boards compartilhados)
DROP POLICY IF EXISTS "Projects isolation policy" ON public.projects;
CREATE POLICY "Projects isolation policy"
  ON public.projects FOR ALL
  USING (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.projects.workspace_id AND wm.user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.projects.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.projects.workspace_id AND wm.user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.projects.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
    )
  );

-- Políticas para CARDS e TASKS (Compartilhamento entre membros do workspace)
DROP POLICY IF EXISTS "Cards isolation policy" ON public.cards;
CREATE POLICY "Cards isolation policy"
  ON public.cards FOR ALL
  USING (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.cards.workspace_id AND wm.user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.cards.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.cards.workspace_id AND wm.user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.cards.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
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
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.tasks.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_auth_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.tasks.workspace_id AND wm.user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.tasks.workspace_id AND (
        w.tenant_id = public.get_auth_tenant_id() OR
        w.owner_id = auth.uid()::text
      )
    )
  );

-- Políticas de Compatibilidade para clientes web (Select e All com RLS ativo)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
  CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Profiles all policy" ON public.profiles;
  CREATE POLICY "Profiles all policy" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Workspaces select policy" ON public.workspaces;
  CREATE POLICY "Workspaces select policy" ON public.workspaces FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Workspaces all policy" ON public.workspaces;
  CREATE POLICY "Workspaces all policy" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Workspace members select policy" ON public.workspace_members;
  CREATE POLICY "Workspace members select policy" ON public.workspace_members FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Workspace members all policy" ON public.workspace_members;
  CREATE POLICY "Workspace members all policy" ON public.workspace_members FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Projects select policy" ON public.projects;
  CREATE POLICY "Projects select policy" ON public.projects FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Projects all policy" ON public.projects;
  CREATE POLICY "Projects all policy" ON public.projects FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Cards select policy" ON public.cards;
  CREATE POLICY "Cards select policy" ON public.cards FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Cards all policy" ON public.cards;
  CREATE POLICY "Cards all policy" ON public.cards FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Tasks select policy" ON public.tasks;
  CREATE POLICY "Tasks select policy" ON public.tasks FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Tasks all policy" ON public.tasks;
  CREATE POLICY "Tasks all policy" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Tenants select policy" ON public.tenants;
  CREATE POLICY "Tenants select policy" ON public.tenants FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Tenants all policy" ON public.tenants;
  CREATE POLICY "Tenants all policy" ON public.tenants FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Fichas select policy" ON public.fichas_tecnicas;
  CREATE POLICY "Fichas select policy" ON public.fichas_tecnicas FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Fichas all policy" ON public.fichas_tecnicas;
  CREATE POLICY "Fichas all policy" ON public.fichas_tecnicas FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Plans select policy" ON public.subscription_plans;
  CREATE POLICY "Plans select policy" ON public.subscription_plans FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Plans all policy" ON public.subscription_plans;
  CREATE POLICY "Plans all policy" ON public.subscription_plans FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 12. Inserir Tenant Matriz e Workspace Padrão
INSERT INTO public.tenants (id, name, legal_name, plan, status, payment_status, owner_id, owner_name, owner_email, max_users)
VALUES ('tenant-matriz', 'OperaTask Matriz', 'OperaTask Tecnologia Ltda', 'enterprise', 'active', 'paid', 'user-master-alan', 'Alan Silva (Master)', 'alanvitordasilva@gmail.com.br', 9999)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspaces (id, tenant_id, name, slug, description, logo_color, owner_id)
VALUES ('ws-principal', 'tenant-matriz', 'Meu Workspace', 'meu-workspace', 'Espaço de trabalho corporativo', '#173653', 'user-master-alan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, workspace_id, name, description, color, icon, columns, member_ids, is_archived)
VALUES (
  'proj-ws-principal-principal',
  'ws-principal',
  'Quadro Principal',
  'Quadro de tarefas e fluxo operacional do espaço Meu Workspace',
  '#2563eb',
  'folder',
  '[{"id":"col-ws-principal-backlog","title":"Backlog","color":"#64748b","order":0},{"id":"col-ws-principal-progress","title":"Em Andamento","color":"#2563eb","order":1},{"id":"col-ws-principal-review","title":"Revisão / QA","color":"#d97706","order":2},{"id":"col-ws-principal-done","title":"Concluído","color":"#059669","order":3,"isCompletedColumn":true}]'::jsonb,
  '[]'::jsonb,
  false
)
ON CONFLICT (id) DO NOTHING;

-- 13. Tabela de Planos de Assinatura Editáveis (subscription_plans)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  badge TEXT,
  description TEXT,
  price_monthly NUMERIC DEFAULT 0,
  price_annual NUMERIC DEFAULT 0,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  max_users INTEGER DEFAULT 5,
  max_boards INTEGER DEFAULT 3,
  features JSONB DEFAULT '[]'::jsonb,
  modules JSONB DEFAULT '{}'::jsonb,
  popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Subscription plans read policy" ON public.subscription_plans;
  CREATE POLICY "Subscription plans read policy" ON public.subscription_plans FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Subscription plans write policy" ON public.subscription_plans;
  CREATE POLICY "Subscription plans write policy" ON public.subscription_plans FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 14. Inserir Planos Pré-definidos Editáveis (Gratuito, Básico, Intermediário, Profissional)
INSERT INTO public.subscription_plans (id, name, badge, description, price_monthly, price_annual, max_users, max_boards, features, modules, popular, is_active, order_index)
VALUES
(
  'gratuito',
  'Gratuito',
  'Para Conhecer',
  'Acesso essencial para conhecer e testar a plataforma OperaTask',
  0,
  0,
  3,
  1,
  '["Até 3 membros na equipe", "1 quadro (board) operacional", "Visualização Kanban e Lista", "Cards com checklists e anexos básicos", "Fichas técnicas essenciais", "Suporte via FAQ e comunidade"]'::jsonb,
  '{"advancedReports": false, "customAttachments": false, "automations": false, "unlimitedFichas": false, "exportData": false, "auditLog": false, "prioritySupport": false}'::jsonb,
  false,
  true,
  0
),
(
  'basico',
  'Básico',
  'Início da Operação',
  'Estruturação ideal para pequenas equipes e fluxos operacionais',
  97,
  970,
  8,
  3,
  '["Até 8 membros na equipe", "Até 3 quadros (boards) operacionais", "Fichas técnicas padrão", "Filtros avançados e tags personalizadas", "Histórico de atividades recentes", "Exportação básica de relatórios", "Suporte por e-mail em horário comercial"]'::jsonb,
  '{"advancedReports": false, "customAttachments": true, "automations": false, "unlimitedFichas": false, "exportData": true, "auditLog": false, "prioritySupport": false}'::jsonb,
  false,
  true,
  1
),
(
  'intermediario',
  'Intermediário',
  'Mais Popular',
  'Controle completo de produção para empresas em expansão',
  197,
  1970,
  20,
  8,
  '["Até 20 membros na equipe", "Até 8 quadros (boards) simultâneos", "Fichas técnicas completas com cálculo de custos", "Relatórios de produtividade e métricas avançadas", "Anexos de mídias e fotos ilimitados", "Exportação de dados em PDF / Excel", "Suporte prioritário via WhatsApp"]'::jsonb,
  '{"advancedReports": true, "customAttachments": true, "automations": true, "unlimitedFichas": true, "exportData": true, "auditLog": true, "prioritySupport": true}'::jsonb,
  true,
  true,
  2
),
(
  'profissional',
  'Profissional',
  'Máxima Potência',
  'Escala corporativa com automações, auditoria e suporte VIP',
  347,
  3470,
  50,
  25,
  '["Até 50 membros na equipe", "Até 25 quadros (boards) de projetos", "Automações e gatilhos de produção", "Dashboard macro com BI e indicadores operacionais", "Registro de auditoria e conformidade", "Fichas técnicas e ordens ilimitadas", "Gerente de contas dedicado e suporte 24/7"]'::jsonb,
  '{"advancedReports": true, "customAttachments": true, "automations": true, "unlimitedFichas": true, "exportData": true, "auditLog": true, "prioritySupport": true}'::jsonb,
  false,
  true,
  3
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  max_users = EXCLUDED.max_users,
  max_boards = EXCLUDED.max_boards,
  features = EXCLUDED.features,
  modules = EXCLUDED.modules,
  popular = EXCLUDED.popular,
  is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index;




