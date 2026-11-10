-- ============================================================================
-- OPERATASK - SCRIPT DE LIMPEZA GERAL DE DADOS DE TESTE (RESET PARA PRODUÇÃO)
-- ============================================================================
-- Este script limpa em cascata todos os clientes, empresas, workspaces,
-- quadros, tarefas, membros e perfis de teste criados antes do lançamento oficial.
--
-- REGRAS ESTRITAS DE PRESERVAÇÃO:
-- 1. Preserva o Administrador Master Alan Silva (alanvitordasilva@gmail.com.br / user-master-alan)
-- 2. Preserva a Empresa Matriz (tenant-matriz / client-matriz)
-- 3. Preserva o Workspace Padrão (ws-principal) e Quadro Principal
-- 4. Preserva a Tabela de Planos de Assinatura (subscription_plans) e tags do sistema
-- 5. Respeita chaves estrangeiras (Foreign Keys) apagando dependências primeiro
-- ============================================================================

BEGIN;

-- 1. Apagar Tarefas, Cards e Itens de Produção de teste
DELETE FROM public.tasks 
WHERE workspace_id != 'ws-principal';

DELETE FROM public.cards 
WHERE workspace_id != 'ws-principal';

-- 2. Apagar Fichas Técnicas vinculadas a workspaces ou tenants de teste
DELETE FROM public.fichas_tecnicas 
WHERE workspace_id IS NOT NULL 
  AND workspace_id != 'ws-principal';

-- 3. Apagar Quadros / Projetos secundários de teste
DELETE FROM public.projects 
WHERE workspace_id != 'ws-principal';

-- 4. Apagar vínculos de membros nos workspaces de teste
DELETE FROM public.workspace_members 
WHERE workspace_id != 'ws-principal';

-- No workspace principal, manter exclusivamente o Master como membro
DELETE FROM public.workspace_members 
WHERE workspace_id = 'ws-principal' 
  AND user_id NOT IN ('user-master-alan', (SELECT id::text FROM auth.users WHERE email ILIKE 'alanvitordasilva@gmail.com%'));

-- 5. Apagar Workspaces de teste (mantendo apenas o ws-principal)
DELETE FROM public.workspaces 
WHERE id != 'ws-principal';

-- 6. Apagar Empresas / Tenants de teste (mantendo apenas a Matriz)
DELETE FROM public.tenants 
WHERE id NOT IN ('tenant-matriz', 'client-matriz');

-- 7. Apagar Perfis de Utilizadores de teste na tabela profiles
DELETE FROM public.profiles 
WHERE id NOT IN (
  'user-master-alan',
  COALESCE((SELECT id FROM auth.users WHERE email = 'alanvitordasilva@gmail.com.br'), '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE((SELECT id FROM auth.users WHERE email = 'alanvitordasilva@gmail.com'), '00000000-0000-0000-0000-000000000000'::uuid)
)
AND email NOT IN ('alanvitordasilva@gmail.com.br', 'alanvitordasilva@gmail.com');

-- 8. Garantir que a Matriz e o Workspace Principal estão íntegros
INSERT INTO public.tenants (id, name, legal_name, plan, status, payment_status, owner_id, owner_name, owner_email, max_users)
VALUES ('tenant-matriz', 'OperaTask Matriz', 'OperaTask Tecnologia Ltda', 'profissional', 'active', 'paid', 'user-master-alan', 'Alan Silva (Master)', 'alanvitordasilva@gmail.com.br', 9999)
ON CONFLICT (id) DO UPDATE SET status = 'active', payment_status = 'paid';

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

COMMIT;

-- ============================================================================
-- INSTRUÇÃO ADICIONAL: LIMPEZA DE AUTENTICAÇÃO NO SUPABASE (auth.users)
-- ============================================================================
-- Devido a restrições de permissão do PostgreSQL no Supabase, a tabela auth.users
-- só pode ser gerenciada com o papel de serviço (postgres/supabase_admin).
-- Para remover os utilizadores de teste também da tela de "Authentication" do Supabase,
-- execute o seguinte comando individualmente no SQL Editor:
--
-- DELETE FROM auth.users 
-- WHERE email NOT IN (
--   'alanvitordasilva@gmail.com.br',
--   'alanvitordasilva@gmail.com'
-- );
-- ============================================================================
