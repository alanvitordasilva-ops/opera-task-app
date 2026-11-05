import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Workspace,
  Project,
  Task,
  User,
  Tag,
  Priority,
  WorkspaceActivity,
  Notification,
  SupabaseConfig,
  ProfileTipo,
  WorkspaceRole,
  SupabaseProfile,
} from '../types/index.ts';

const SUPABASE_CONFIG_KEY = 'operatask_supabase_config_v1';

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static cachedConfig: SupabaseConfig | null = null;

  // Obter configurações do Supabase (do localStorage ou variáveis de ambiente NEXT_PUBLIC_* / VITE_*)
  static getConfig(): SupabaseConfig {
    if (this.cachedConfig) return this.cachedConfig;

    const env = (import.meta as any).env || {};
    const proc = typeof process !== 'undefined' ? process.env || {} : {};

    // Prioridade máxima para NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
    const envUrl = (
      env.NEXT_PUBLIC_SUPABASE_URL ||
      proc.NEXT_PUBLIC_SUPABASE_URL ||
      env.VITE_SUPABASE_URL ||
      proc.VITE_SUPABASE_URL ||
      ''
    ).trim();

    const envKey = (
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      proc.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_ANON_KEY ||
      proc.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cachedConfig = {
          url: parsed.url || envUrl,
          anonKey: parsed.anonKey || envKey,
          enabled: parsed.enabled ?? Boolean(parsed.url || envUrl),
          lastSyncedAt: parsed.lastSyncedAt || null,
        };
        return this.cachedConfig;
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações salvas do Supabase:', e);
    }

    this.cachedConfig = {
      url: envUrl,
      anonKey: envKey,
      enabled: Boolean(envUrl && envKey),
      lastSyncedAt: null,
    };
    return this.cachedConfig;
  }

  // Salvar configurações do Supabase no storage local
  static saveConfig(config: SupabaseConfig): void {
    this.cachedConfig = config;
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
      this.client = null; // Reinicializa o client com os novos parâmetros
    } catch (e) {
      console.error('Falha ao salvar configuração do Supabase:', e);
    }
  }

  // Obter ou inicializar o cliente Supabase
  static getClient(): SupabaseClient | null {
    if (this.client) return this.client;

    const config = this.getConfig();
    if (config.url && config.anonKey) {
      try {
        this.client = createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
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

  // Verifica se o Supabase está ativado e com credenciais válidas
  static isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.url && config.anonKey && config.enabled !== false);
  }

  // Testar conexão com o banco de dados Supabase
  static async testConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
    const testUrl = (url || this.getConfig().url || '').trim();
    const testKey = (key || this.getConfig().anonKey || '').trim();

    if (!testUrl || !testKey) {
      return { success: false, message: 'URL e Anon Key do Supabase são obrigatórios.' };
    }

    try {
      const tempClient = createClient(testUrl, testKey);
      // Consulta básica na tabela profiles ou auth
      const { error } = await tempClient.from('profiles').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return {
            success: true,
            message: 'Conectado à API do Supabase! Execute o script SQL no Supabase para criar as tabelas.',
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

  // ==========================================================================
  // Autenticação Real no Supabase (Aceita Nome de Usuário OU E-mail)
  // ==========================================================================
  static async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não está configurado ou habilitado.' };
    }

    const rawIdent = identifier.trim();
    const cleanIdent = rawIdent.toLowerCase();
    const cleanIdentWithoutAt = cleanIdent.replace(/^@/, '');

    try {
      let targetEmail = cleanIdent;

      // Se não contiver '@', é nome de usuário -> busca o e-mail na tabela profiles
      if (!cleanIdent.includes('@')) {
        const { data: profileMatch } = await client
          .from('profiles')
          .select('*')
          .or(`email.ilike.${cleanIdentWithoutAt}@%,nome.ilike.%${cleanIdentWithoutAt}%`)
          .limit(1)
          .maybeSingle();

        if (profileMatch?.email) {
          targetEmail = profileMatch.email;
        } else {
          // Padrão interno gerado no cadastro para usuários sem e-mail próprio
          targetEmail = `${cleanIdentWithoutAt}@operatask.app`;
        }
      }

      // Autentica via Supabase Auth
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: targetEmail,
        password: password.trim(),
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      const authUser = authData.user;
      if (!authUser) {
        return { success: false, error: 'Falha ao recuperar sessão do usuário.' };
      }

      // Busca dados completos do perfil na tabela profiles
      let profile: SupabaseProfile | null = null;
      try {
        const { data: pData } = await client
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        profile = pData;
      } catch (e) {
        console.warn('Erro ao carregar perfil do usuário no Supabase:', e);
      }

      const roleTitleMap: Record<string, string> = {
        master: 'Super Administrador / Master',
        dono: 'Dono do Workspace',
        owner: 'Dono do Workspace',
        administrador: 'Administrador',
        admin: 'Administrador',
        producao: 'Produção',
        production: 'Produção',
        membro: 'Membro da Equipe',
        member: 'Membro da Equipe',
        visualizador: 'Visualizador',
        viewer: 'Visualizador',
      };

      const tipo: ProfileTipo = (profile?.tipo as ProfileTipo) || 'membro';
      const isMaster = tipo === 'master' || authUser.email === 'alanvitordasilva@gmail.com.br';

      const userObj: User = {
        id: authUser.id,
        name: profile?.nome || authUser.user_metadata?.nome || authUser.email?.split('@')[0] || 'Usuário',
        username: cleanIdentWithoutAt,
        email: authUser.email || targetEmail,
        avatarColor: profile?.avatar_url || authUser.user_metadata?.avatar_url || '#34B1AC',
        title: roleTitleMap[tipo] || 'Membro da Equipe',
        systemRole: isMaster ? 'master' : 'user',
        isSuperAdmin: isMaster,
        tipo: tipo,
        status: 'active',
        isActive: true,
        createdAt: profile?.created_at || authUser.created_at || new Date().toISOString(),
      };

      return { success: true, user: userObj };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro inesperado na autenticação Supabase.' };
    }
  }

  // ==========================================================================
  // Cadastro Real no Supabase (auth.users + profiles + workspace_members)
  // ==========================================================================
  static async registerUser(params: {
    name: string;
    username: string;
    email?: string;
    password: string;
    tipo: ProfileTipo;
    workspaceId: string;
    avatarColor?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não está configurado.' };
    }

    const cleanName = params.name.trim();
    const cleanUsername = params.username.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').replace(/^@/, '');
    const cleanEmail = (params.email || `${cleanUsername}@operatask.app`).trim().toLowerCase();
    const cleanPassword = params.password.trim();
    const targetWsId = params.workspaceId.trim();
    const chosenColor = params.avatarColor || '#34B1AC';

    try {
      // 1. Cadastra usuário no Supabase Auth
      const { data: authData, error: authErr } = await client.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            nome: cleanName,
            name: cleanName,
            username: cleanUsername,
            tipo: params.tipo,
            avatar_url: chosenColor,
          },
        },
      });

      if (authErr) {
        // Se o usuário já existir no auth, continua para garantir vínculo
        if (!authErr.message?.includes('already registered')) {
          return { success: false, error: authErr.message };
        }
      }

      const userId = authData?.user?.id || `user-sb-${Date.now()}`;

      // 2. Garante gravação direta na tabela profiles
      try {
        await client.from('profiles').upsert({
          id: userId,
          nome: cleanName,
          email: cleanEmail,
          tipo: params.tipo,
          avatar_url: chosenColor,
          created_at: new Date().toISOString(),
        });
      } catch (pErr) {
        console.warn('[Supabase] Aviso ao gravar na tabela profiles:', pErr);
      }

      // 3. Vincula imediatamente na tabela workspace_members
      if (targetWsId) {
        try {
          await client.from('workspace_members').upsert({
            workspace_id: targetWsId,
            user_id: userId,
            role: params.tipo,
            joined_at: new Date().toISOString(),
          });
        } catch (mErr) {
          console.warn('[Supabase] Aviso ao vincular membro no workspace:', mErr);
        }
      }

      const roleTitleMap: Record<string, string> = {
        master: 'Super Administrador / Master',
        dono: 'Dono do Workspace',
        owner: 'Dono do Workspace',
        administrador: 'Administrador',
        admin: 'Administrador',
        producao: 'Produção',
        production: 'Produção',
        membro: 'Membro da Equipe',
        member: 'Membro da Equipe',
        visualizador: 'Visualizador',
        viewer: 'Visualizador',
      };

      const newUser: User = {
        id: userId,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        avatarColor: chosenColor,
        title: roleTitleMap[params.tipo] || 'Membro da Equipe',
        tipo: params.tipo,
        status: 'active',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao cadastrar usuário no Supabase.' };
    }
  }

  // ==========================================================================
  // Buscar lista de perfis do Supabase
  // ==========================================================================
  static async fetchProfiles(): Promise<SupabaseProfile[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client.from('profiles').select('*');
      if (error || !data) return [];
      return data as SupabaseProfile[];
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Sincronizar todos os dados para o Supabase (Push)
  // ==========================================================================
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
          created_at: w.createdAt,
        }));
        const { error: wsErr } = await client.from('workspaces').upsert(wsPayload);
        if (wsErr && !wsErr.message?.includes('does not exist')) {
          console.warn('Erro ao sincronizar workspaces no Supabase:', wsErr);
        }

        // Sincroniza workspace_members
        for (const w of data.workspaces) {
          if (Array.isArray(w.members) && w.members.length > 0) {
            const memPayload = w.members.map((m) => ({
              workspace_id: w.id,
              user_id: m.userId,
              role: m.role,
              joined_at: m.joinedAt || new Date().toISOString(),
            }));
            await client.from('workspace_members').upsert(memPayload);
          }
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
        const { error: pErr } = await client.from('projects').upsert(projPayload);
        if (pErr && !pErr.message?.includes('does not exist')) {
          console.warn('Erro ao sincronizar projetos no Supabase:', pErr);
        }
      }

      // 3. Tarefas / Cards (Grava em cards e tasks)
      if (data.tasks.length > 0) {
        const cardsPayload = data.tasks.map((t) => ({
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

        try {
          await client.from('cards').upsert(cardsPayload);
        } catch {}
        try {
          await client.from('tasks').upsert(cardsPayload);
        } catch {}
      }

      // 4. Tags
      if (data.tags.length > 0) {
        try {
          await client.from('tags').upsert(data.tags);
        } catch {}
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

  // ==========================================================================
  // Mapeadores entre Modelo da Aplicação (Task) e Tabelas Supabase (cards / tasks)
  // ==========================================================================
  static mapRowToTask(row: any): Task {
    const parseJsonField = (val: any, fallback: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return fallback;
    };

    return {
      id: String(row.id),
      workspaceId: row.workspace_id || 'ws-principal',
      projectId: row.project_id || 'proj-1',
      columnId: row.column_id || 'col-1',
      title: row.title || 'Sem título',
      description: row.description || '',
      priority: (row.priority as Priority) || 'none',
      assigneeIds: parseJsonField(row.assignee_ids, []),
      dueDate: row.due_date || '',
      tags: parseJsonField(row.tags, []),
      checklist: parseJsonField(row.checklist, []),
      comments: parseJsonField(row.comments, []),
      activities: parseJsonField(row.activities, []),
      attachments: parseJsonField(row.attachments, []),
      fichaTecnica: row.ficha_tecnica ? (typeof row.ficha_tecnica === 'string' ? JSON.parse(row.ficha_tecnica) : row.ficha_tecnica) : null,
      productionRecords: parseJsonField(row.production_records, []),
      isCompleted: Boolean(row.is_completed),
      completedAt: row.completed_at || null,
      isArchived: Boolean(row.is_archived),
      archivedAt: row.archived_at || null,
      order: typeof row.order_index === 'number' ? row.order_index : (row.order ?? 0),
      frameColor: row.frame_color || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  static mapTaskToRow(task: Partial<Task>): any {
    const row: any = {};
    if (task.id !== undefined) row.id = task.id;
    if (task.workspaceId !== undefined) row.workspace_id = task.workspaceId;
    if (task.projectId !== undefined) row.project_id = task.projectId;
    if (task.columnId !== undefined) row.column_id = task.columnId;
    if (task.title !== undefined) row.title = task.title;
    if (task.description !== undefined) row.description = task.description;
    if (task.priority !== undefined) row.priority = task.priority;
    if (task.assigneeIds !== undefined) row.assignee_ids = task.assigneeIds;
    if (task.dueDate !== undefined) row.due_date = task.dueDate;
    if (task.tags !== undefined) row.tags = task.tags;
    if (task.checklist !== undefined) row.checklist = task.checklist;
    if (task.comments !== undefined) row.comments = task.comments;
    if (task.activities !== undefined) row.activities = task.activities;
    if (task.attachments !== undefined) row.attachments = task.attachments;
    if (task.fichaTecnica !== undefined) row.ficha_tecnica = task.fichaTecnica;
    if (task.productionRecords !== undefined) row.production_records = task.productionRecords;
    if (task.isCompleted !== undefined) row.is_completed = Boolean(task.isCompleted);
    if (task.completedAt !== undefined) row.completed_at = task.completedAt;
    if (task.isArchived !== undefined) row.is_archived = Boolean(task.isArchived);
    if (task.archivedAt !== undefined) row.archived_at = task.archivedAt;
    if (task.order !== undefined) row.order_index = task.order;
    if (task.frameColor !== undefined) row.frame_color = task.frameColor;
    if (task.createdAt !== undefined) row.created_at = task.createdAt;
    row.updated_at = task.updatedAt || new Date().toISOString();
    return row;
  }

  // ==========================================================================
  // CRUD COMPLETO E ASSÍNCRONO DE TAREFAS NO SUPABASE
  // ==========================================================================

  /**
   * Listar tarefas diretamente da nuvem do Supabase (R do CRUD)
   */
  static async fetchTasks(workspaceId?: string, projectId?: string): Promise<{ success: boolean; tasks: Task[]; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, tasks: [], error: 'Supabase não está configurado ou habilitado.' };
    }

    try {
      // 1. Tenta buscar na tabela 'cards'
      let query = client.from('cards').select('*');
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }
      query = query.order('order_index', { ascending: true });

      let { data, error } = await query;

      // Se a tabela 'cards' não existir ou der erro de tabela, tenta a tabela 'tasks'
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        let taskQuery = client.from('tasks').select('*');
        if (workspaceId) {
          taskQuery = taskQuery.eq('workspace_id', workspaceId);
        }
        if (projectId && projectId !== 'all') {
          taskQuery = taskQuery.eq('project_id', projectId);
        }
        taskQuery = taskQuery.order('order_index', { ascending: true });
        const fallbackRes = await taskQuery;
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('[Supabase CRUD] Erro ao listar tarefas:', error.message);
        return { success: false, tasks: [], error: error.message };
      }

      const tasks = Array.isArray(data) ? data.map(this.mapRowToTask) : [];
      return { success: true, tasks };
    } catch (err: any) {
      console.error('[Supabase CRUD] Exceção ao listar tarefas:', err);
      return { success: false, tasks: [], error: err.message };
    }
  }

  /**
   * Criar uma nova tarefa no Supabase (C do CRUD)
   */
  static async createTask(task: Task): Promise<{ success: boolean; task?: Task; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não está configurado.' };
    }

    try {
      const row = this.mapTaskToRow(task);

      // Upsert na tabela 'cards'
      let { data, error } = await client.from('cards').upsert(row).select().maybeSingle();

      // Fallback para 'tasks' se 'cards' não existir
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        const fallback = await client.from('tasks').upsert(row).select().maybeSingle();
        data = fallback.data;
        error = fallback.error;
      } else {
        // Tenta espelhar de forma silenciosa para 'tasks'
        Promise.resolve(client.from('tasks').upsert(row)).catch(() => {});
      }

      if (error) {
        console.warn('[Supabase CRUD] Erro ao criar tarefa:', error.message);
        return { success: false, error: error.message };
      }

      const created = data ? this.mapRowToTask(data) : task;
      return { success: true, task: created };
    } catch (err: any) {
      console.error('[Supabase CRUD] Exceção ao criar tarefa:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Atualizar uma tarefa existente no Supabase (U do CRUD)
   */
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<{ success: boolean; task?: Task; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não está configurado.' };
    }

    try {
      const rowUpdates = this.mapTaskToRow(updates);
      delete rowUpdates.id; // Garante que o ID não seja alterado

      let { data, error } = await client
        .from('cards')
        .update(rowUpdates)
        .eq('id', taskId)
        .select()
        .maybeSingle();

      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        const fallback = await client
          .from('tasks')
          .update(rowUpdates)
          .eq('id', taskId)
          .select()
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      } else {
        Promise.resolve(client.from('tasks').update(rowUpdates).eq('id', taskId)).catch(() => {});
      }

      if (error) {
        console.warn('[Supabase CRUD] Erro ao atualizar tarefa:', error.message);
        return { success: false, error: error.message };
      }

      const updated = data ? this.mapRowToTask(data) : undefined;
      return { success: true, task: updated };
    } catch (err: any) {
      console.error('[Supabase CRUD] Exceção ao atualizar tarefa:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Apagar uma tarefa no Supabase (D do CRUD)
   */
  static async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não está configurado.' };

    try {
      let { error } = await client.from('cards').delete().eq('id', taskId);

      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        const fallback = await client.from('tasks').delete().eq('id', taskId);
        error = fallback.error;
      } else {
        Promise.resolve(client.from('tasks').delete().eq('id', taskId)).catch(() => {});
      }

      if (error) {
        console.warn('[Supabase CRUD] Erro ao excluir tarefa:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Supabase CRUD] Exceção ao excluir tarefa:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Buscar uma tarefa individual por ID no Supabase
   */
  static async getTaskById(taskId: string): Promise<{ success: boolean; task?: Task; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não está configurado.' };

    try {
      let { data, error } = await client.from('cards').select('*').eq('id', taskId).maybeSingle();
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        const fallback = await client.from('tasks').select('*').eq('id', taskId).maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: 'Tarefa não encontrada.' };
      return { success: true, task: this.mapRowToTask(data) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sincronizar card individual em tempo real (compatibilidade)
   */
  static async syncTask(task: Task): Promise<boolean> {
    const res = await this.createTask(task);
    return res.success;
  }

  // Gerar SQL completo para criação de tabelas no Supabase SQL Editor
  static getSchemaSQL(): string {
    return `-- ============================================================================
-- SCRIPT DE BANCO DE DADOS SUPABASE PARA OPERATASK (MULTI-USUÁRIO REAL)
-- Cole este script no "SQL Editor" do painel do seu projeto Supabase e execute.
-- ============================================================================

-- 1. Habilitar extensão de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (public.profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'membro' CHECK (tipo IN ('master', 'dono', 'administrador', 'producao', 'membro', 'visualizador')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Políticas com permissões completas para chaves anon e authenticated
DO $$
BEGIN
  DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
  CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Profiles all policy" ON public.profiles;
  CREATE POLICY "Profiles all policy" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Workspaces all policy" ON public.workspaces;
  CREATE POLICY "Workspaces all policy" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Workspace members all policy" ON public.workspace_members;
  CREATE POLICY "Workspace members all policy" ON public.workspace_members FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Projects all policy" ON public.projects;
  CREATE POLICY "Projects all policy" ON public.projects FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Cards all policy" ON public.cards;
  CREATE POLICY "Cards all policy" ON public.cards FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Tasks all policy" ON public.tasks;
  CREATE POLICY "Tasks all policy" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Tags all policy" ON public.tags;
  CREATE POLICY "Tags all policy" ON public.tags FOR ALL USING (true) WITH CHECK (true);
END $$;
`;
  }
}
