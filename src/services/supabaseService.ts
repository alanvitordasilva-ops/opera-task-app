import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Workspace,
  Project,
  Task,
  User,
  Tag,
  WorkspaceActivity,
  Notification,
  SupabaseConfig,
} from '../types/index.ts';

const SUPABASE_CONFIG_KEY = 'operatask_supabase_config_v1';

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static cachedConfig: SupabaseConfig | null = null;

  // Obter configurações do Supabase (do localStorage ou variáveis de ambiente)
  static getConfig(): SupabaseConfig {
    if (this.cachedConfig) return this.cachedConfig;

    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        this.cachedConfig = JSON.parse(stored);
        return this.cachedConfig!;
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações do Supabase:', e);
    }

    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

    this.cachedConfig = {
      url: envUrl,
      anonKey: envKey,
      enabled: Boolean(envUrl && envKey),
      lastSyncedAt: null,
    };
    return this.cachedConfig;
  }

  // Salvar configurações do Supabase
  static saveConfig(config: SupabaseConfig): void {
    this.cachedConfig = config;
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
      this.client = null; // Reinicializa o client
    } catch (e) {
      console.error('Falha ao salvar configuração do Supabase:', e);
    }
  }

  // Obter ou inicializar o cliente do Supabase
  static getClient(): SupabaseClient | null {
    if (this.client) return this.client;

    const config = this.getConfig();
    if (config.url && config.anonKey && config.enabled) {
      try {
        this.client = createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        });
        return this.client;
      } catch (err) {
        console.warn('Erro ao inicializar cliente Supabase:', err);
        return null;
      }
    }
    return null;
  }

  // Testar conexão com o banco de dados Supabase
  static async testConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
    const testUrl = url || this.getConfig().url;
    const testKey = key || this.getConfig().anonKey;

    if (!testUrl || !testKey) {
      return { success: false, message: 'URL e Anon Key do Supabase são obrigatórios.' };
    }

    try {
      const tempClient = createClient(testUrl, testKey);
      // Testa uma consulta simples ou ping
      const { error } = await tempClient.from('operatask_tasks').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // Se a tabela ainda não existir, mas conectou na API, consideramos conexão ok
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return {
            success: true,
            message: 'Conectado ao Supabase! As tabelas do OperaTask podem ser criadas com o script SQL.',
          };
        }
        return { success: false, message: `Erro do Supabase: ${error.message}` };
      }

      return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Falha ao conectar ao servidor Supabase. Verifique a URL e a chave.',
      };
    }
  }

  // Sincronizar todos os dados para o Supabase (Push)
  static async syncAllToCloud(data: {
    workspaces: Workspace[];
    projects: Project[];
    tasks: Task[];
    users: User[];
    tags: Tag[];
    activities: WorkspaceActivity[];
    notifications: Notification[];
  }): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não está configurado ou habilitado.' };
    }

    try {
      // 1. Workspaces
      if (data.workspaces.length > 0) {
        const wsPayload = data.workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
          description: w.description || '',
          logo_color: w.logoColor,
          owner_id: w.ownerId,
          members: w.members,
          created_at: w.createdAt,
        }));
        const { error: wsErr } = await client.from('operatask_workspaces').upsert(wsPayload);
        if (wsErr && !wsErr.message?.includes('does not exist')) {
          console.warn('Erro ao sincronizar workspaces no Supabase:', wsErr);
        }
      }

      // 2. Projetos
      if (data.projects.length > 0) {
        const projPayload = data.projects.map((p) => ({
          id: p.id,
          workspace_id: p.workspaceId,
          name: p.name,
          description: p.description || '',
          color: p.color,
          icon: p.icon,
          columns: p.columns,
          member_ids: p.memberIds,
          is_archived: Boolean(p.isArchived),
          created_at: p.createdAt,
        }));
        const { error: pErr } = await client.from('operatask_projects').upsert(projPayload);
        if (pErr && !pErr.message?.includes('does not exist')) {
          console.warn('Erro ao sincronizar projetos no Supabase:', pErr);
        }
      }

      // 3. Tarefas
      if (data.tasks.length > 0) {
        const tasksPayload = data.tasks.map((t) => ({
          id: t.id,
          workspace_id: t.workspaceId,
          project_id: t.projectId,
          column_id: t.columnId,
          title: t.title,
          description: t.description || '',
          priority: t.priority,
          assignee_ids: t.assigneeIds || [],
          due_date: t.dueDate,
          tags: t.tags || [],
          checklist: t.checklist || [],
          comments: t.comments || [],
          activities: t.activities || [],
          attachments: t.attachments || [],
          is_completed: Boolean(t.isCompleted),
          completed_at: t.completedAt || null,
          is_archived: Boolean(t.isArchived),
          archived_at: t.archivedAt || null,
          order_index: t.order || 0,
          created_at: t.createdAt,
          updated_at: t.updatedAt || new Date().toISOString(),
        }));
        const { error: tErr } = await client.from('operatask_tasks').upsert(tasksPayload);
        if (tErr && !tErr.message?.includes('does not exist')) {
          console.warn('Erro ao sincronizar tarefas no Supabase:', tErr);
        }
      }

      // 4. Tags
      if (data.tags.length > 0) {
        const { error: tagErr } = await client.from('operatask_tags').upsert(data.tags);
        if (tagErr && !tagErr.message?.includes('does not exist')) {
          console.warn('Erro ao sincronizar tags no Supabase:', tagErr);
        }
      }

      // Atualiza timestamp de sincronização
      const cfg = this.getConfig();
      cfg.lastSyncedAt = new Date().toISOString();
      this.saveConfig(cfg);

      return { success: true };
    } catch (err: any) {
      console.error('Falha geral na sincronização com Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  // Sincronizar tarefa individual em tempo real
  static async syncTask(task: Task): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: task.id,
        workspace_id: task.workspaceId,
        project_id: task.projectId,
        column_id: task.columnId,
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        assignee_ids: task.assigneeIds || [],
        due_date: task.dueDate,
        tags: task.tags || [],
        checklist: task.checklist || [],
        comments: task.comments || [],
        activities: task.activities || [],
        attachments: task.attachments || [],
        is_completed: Boolean(task.isCompleted),
        completed_at: task.completedAt || null,
        is_archived: Boolean(task.isArchived),
        archived_at: task.archivedAt || null,
        order_index: task.order || 0,
        created_at: task.createdAt,
        updated_at: task.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('operatask_tasks').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  // Excluir tarefa no Supabase
  static async deleteTask(taskId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client.from('operatask_tasks').delete().eq('id', taskId);
      return !error;
    } catch {
      return false;
    }
  }

  // Gerar SQL completo para criação de tabelas no Supabase SQL Editor
  static getSchemaSQL(): string {
    return `-- ==========================================
-- SCRIPT DE CRIAÇÃO DE TABELAS OPERATASK
-- Cole este script no SQL Editor do seu projeto Supabase
-- ==========================================

-- 1. Tabela de Workspaces
CREATE TABLE IF NOT EXISTS operatask_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  logo_color TEXT DEFAULT '#2563eb',
  owner_id TEXT NOT NULL,
  members JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Projetos
CREATE TABLE IF NOT EXISTS operatask_projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES operatask_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#2563eb',
  icon TEXT DEFAULT 'folder',
  columns JSONB DEFAULT '[]'::jsonb,
  member_ids JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Tarefas (Cards)
CREATE TABLE IF NOT EXISTS operatask_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES operatask_workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES operatask_projects(id) ON DELETE CASCADE,
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

-- 4. Tabela de Etiquetas / Tags
CREATE TABLE IF NOT EXISTS operatask_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Habilitar políticas de acesso (RLS liberado para a chave anon)
ALTER TABLE operatask_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE operatask_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE operatask_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE operatask_tags ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para chave pública (anon)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Workspaces Policy" ON operatask_workspaces;
  CREATE POLICY "Public Workspaces Policy" ON operatask_workspaces FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Projects Policy" ON operatask_projects;
  CREATE POLICY "Public Projects Policy" ON operatask_projects FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Tasks Policy" ON operatask_tasks;
  CREATE POLICY "Public Tasks Policy" ON operatask_tasks FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Tags Policy" ON operatask_tags;
  CREATE POLICY "Public Tags Policy" ON operatask_tags FOR ALL USING (true) WITH CHECK (true);
END $$;
`;
  }
}
