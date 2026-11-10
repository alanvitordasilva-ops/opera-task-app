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
  BoardColumn,
  SubscriptionPlan,
  DEFAULT_SUBSCRIPTION_PLANS,
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

    // Prioridade máxima para as variáveis públicas padrão:
    // process.env.NEXT_PUBLIC_SUPABASE_URL e process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const envUrl = (
      proc.NEXT_PUBLIC_SUPABASE_URL ||
      env.NEXT_PUBLIC_SUPABASE_URL ||
      proc.VITE_SUPABASE_URL ||
      env.VITE_SUPABASE_URL ||
      ''
    ).trim();

    const envKey = (
      proc.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      proc.VITE_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_ANON_KEY ||
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
    companyId?: string;
    tenantId?: string;
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

    // Determina o ID de empresa/tenant associado
    let effectiveTenantId = params.tenantId || params.companyId;
    if (!effectiveTenantId && targetWsId) {
      try {
        const { data: wsRow } = await client
          .from('workspaces')
          .select('tenant_id, company_id')
          .eq('id', targetWsId)
          .maybeSingle();
        if (wsRow) {
          effectiveTenantId = wsRow.tenant_id || wsRow.company_id || targetWsId;
        }
      } catch {}
    }

    try {
      // 1. Cadastra usuário no Supabase Auth com metadados de tenant e workspace
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
            tenant_id: effectiveTenantId || targetWsId || null,
            company_id: effectiveTenantId || targetWsId || null,
            workspace_id: targetWsId || null,
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

      // 2. Garante gravação direta na tabela profiles com tenant_id e company_id
      try {
        const profilePayload: any = {
          id: userId,
          nome: cleanName,
          email: cleanEmail,
          tipo: params.tipo,
          avatar_url: chosenColor,
          tenant_id: effectiveTenantId || targetWsId || null,
          company_id: effectiveTenantId || targetWsId || null,
          workspace_id: targetWsId || null,
          created_at: new Date().toISOString(),
        };

        const { error: pError } = await client.from('profiles').upsert(profilePayload);
        if (pError && (pError.message?.includes('column') || pError.message?.includes('does not exist'))) {
          // Fallback caso a tabela profiles ainda não tenha colunas tenant_id ou workspace_id
          await client.from('profiles').upsert({
            id: userId,
            nome: cleanName,
            email: cleanEmail,
            tipo: params.tipo,
            avatar_url: chosenColor,
            created_at: new Date().toISOString(),
          });
        }
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
        companyId: effectiveTenantId || targetWsId,
        tenantId: effectiveTenantId || targetWsId,
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
  static async fetchProfiles(companyIdOrWorkspaceId?: string): Promise<SupabaseProfile[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      let query = client.from('profiles').select('*');
      if (companyIdOrWorkspaceId) {
        // Filtra por tenant_id ou company_id diretamente no Supabase
        query = query.or(`company_id.eq.${companyIdOrWorkspaceId},tenant_id.eq.${companyIdOrWorkspaceId}`);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data as SupabaseProfile[];
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // ==========================================================================
  // Workspaces CRUD no Supabase (com filtro multi-tenant e proteção anti-vazio)
  // ==========================================================================
  static async fetchWorkspaces(params?: {
    companyId?: string;
    tenantId?: string;
    workspaceId?: string;
    userId?: string;
    isSuperAdmin?: boolean;
  }): Promise<{ success: boolean; workspaces: Workspace[]; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, workspaces: [], error: 'Supabase não conectado' };
    }

    try {
      let query = client.from('workspaces').select('*').order('created_at', { ascending: true });

      const targetTenantId = params?.tenantId || params?.companyId;
      if (!params?.isSuperAdmin) {
        if (targetTenantId && params?.workspaceId) {
          query = query.or(`tenant_id.eq.${targetTenantId},company_id.eq.${targetTenantId},id.eq.${params.workspaceId},owner_id.eq.${params?.userId || ''}`);
        } else if (targetTenantId) {
          query = query.or(`tenant_id.eq.${targetTenantId},company_id.eq.${targetTenantId},owner_id.eq.${params?.userId || ''}`);
        } else if (params?.workspaceId) {
          query = query.or(`id.eq.${params.workspaceId},owner_id.eq.${params?.userId || ''}`);
        } else if (params?.userId) {
          query = query.eq('owner_id', params.userId);
        }
      }

      let { data: wsRows, error: wsErr } = await query;

      // Fallback de segurança: se a query filtrada retornar vazia mas o usuário tiver ID de workspace/empresa,
      // busca sem o filtro estrito de coluna para não quebrar a navegação caso a coluna no Supabase seja diferente
      if ((!wsRows || wsRows.length === 0) && !params?.isSuperAdmin && (targetTenantId || params?.workspaceId || params?.userId)) {
        try {
          const fallbackRes = await client.from('workspaces').select('*').order('created_at', { ascending: true });
          if (fallbackRes.data && fallbackRes.data.length > 0) {
            const inMemoryFiltered = fallbackRes.data.filter((row: any) => {
              if (targetTenantId && (row.tenant_id === targetTenantId || row.company_id === targetTenantId || row.id === targetTenantId)) return true;
              if (params?.workspaceId && row.id === params.workspaceId) return true;
              if (params?.userId && row.owner_id === params.userId) return true;
              return false;
            });
            wsRows = inMemoryFiltered.length > 0 ? inMemoryFiltered : fallbackRes.data;
          }
        } catch {}
      }

      if (wsErr && (!wsRows || wsRows.length === 0)) {
        if (!wsErr.message?.includes('does not exist')) {
          console.warn('[SupabaseService] Erro ao buscar workspaces:', wsErr);
        }
        return { success: false, workspaces: [], error: wsErr.message };
      }

      if (!wsRows || wsRows.length === 0) {
        return { success: true, workspaces: [] };
      }

      // Busca membros vinculados
      let memberRows: any[] = [];
      try {
        const { data: mData } = await client.from('workspace_members').select('*');
        if (mData) memberRows = mData;
      } catch (e) {
        console.warn('[SupabaseService] Erro ao buscar membros de workspaces:', e);
      }

      const workspaces: Workspace[] = wsRows.map((row: any) => {
        const rowMembers = memberRows
          .filter((m: any) => m.workspace_id === row.id)
          .map((m: any) => ({
            userId: m.user_id,
            role: m.role || 'membro',
            joinedAt: m.joined_at || row.created_at || new Date().toISOString(),
          }));

        // Se a tabela workspace_members ainda não tiver linhas, assegura o owner como membro 'owner'
        const members = rowMembers.length > 0 ? rowMembers : [
          { userId: row.owner_id, role: 'owner' as const, joinedAt: row.created_at || new Date().toISOString() }
        ];

        const mappedCompanyId = row.tenant_id || row.company_id || undefined;

        return {
          id: String(row.id),
          name: row.name || 'Workspace',
          slug: row.slug || (row.name ? row.name.toLowerCase().replace(/\s+/g, '-') : 'workspace'),
          description: row.description || '',
          logoColor: row.logo_color || '#173653',
          ownerId: row.owner_id,
          companyId: mappedCompanyId,
          companyName: row.company_name || undefined,
          clientStatus: row.client_status || 'active',
          clientPlan: row.client_plan || 'profissional',
          members,
          createdAt: row.created_at || new Date().toISOString(),
        };
      });

      return { success: true, workspaces };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro geral ao buscar workspaces:', err);
      return { success: false, workspaces: [], error: err.message };
    }
  }

  // ==========================================================================
  // Projetos / Quadros CRUD no Supabase (com proteção anti-vazio)
  // ==========================================================================
  static async fetchProjects(params?: {
    workspaceId?: string;
    companyId?: string;
    tenantId?: string;
    isSuperAdmin?: boolean;
  }): Promise<{ success: boolean; projects: Project[]; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, projects: [], error: 'Supabase não conectado' };
    }

    try {
      let query = client.from('projects').select('*').order('created_at', { ascending: true });
      if (params?.workspaceId) {
        query = query.eq('workspace_id', params.workspaceId);
      } else if (!params?.isSuperAdmin) {
        const targetTenant = params?.tenantId || params?.companyId;
        if (targetTenant) {
          query = query.or(`tenant_id.eq.${targetTenant},workspace_id.eq.${targetTenant}`);
        }
      }

      let { data: pRows, error: pErr } = await query;

      // Fallback: se buscou filtrado por workspaceId e retornou vazio, tenta sem filtro para recuperar quadros
      if ((!pRows || pRows.length === 0) && params?.workspaceId) {
        try {
          const fallbackQuery = await client.from('projects').select('*').order('created_at', { ascending: true });
          if (fallbackQuery.data && fallbackQuery.data.length > 0) {
            const matched = fallbackQuery.data.filter((r: any) => r.workspace_id === params.workspaceId);
            if (matched.length > 0) {
              pRows = matched;
            }
          }
        } catch {}
      }

      if (pErr && (!pRows || pRows.length === 0)) {
        if (!pErr.message?.includes('does not exist')) {
          console.warn('[SupabaseService] Erro ao buscar projetos:', pErr);
        }
        return { success: false, projects: [], error: pErr.message };
      }

      const defaultCols: BoardColumn[] = [
        { id: 'col-backlog', title: 'Backlog', color: '#64748b', order: 0 },
        { id: 'col-progress', title: 'Em Andamento', color: '#2563eb', order: 1 },
        { id: 'col-review', title: 'Revisão / QA', color: '#d97706', order: 2 },
        { id: 'col-done', title: 'Concluído', color: '#059669', order: 3, isCompletedColumn: true },
      ];

      const projects: Project[] = (pRows || []).map((row: any) => ({
        id: String(row.id),
        workspaceId: String(row.workspace_id),
        name: row.name || 'Quadro Principal',
        description: row.description || '',
        color: row.color || '#2563eb',
        icon: row.icon || 'folder',
        columns: Array.isArray(row.columns) && row.columns.length > 0 ? row.columns : defaultCols,
        memberIds: Array.isArray(row.member_ids) ? row.member_ids : [],
        isArchived: Boolean(row.is_archived),
        createdAt: row.created_at || new Date().toISOString(),
      }));

      return { success: true, projects };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro geral ao buscar projetos:', err);
      return { success: false, projects: [], error: err.message };
    }
  }

  static async createProject(project: Project): Promise<{ success: boolean; project?: Project; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const payload: any = {
        id: project.id,
        workspace_id: project.workspaceId,
        name: project.name,
        description: project.description || '',
        color: project.color || '#2563eb',
        icon: project.icon || 'folder',
        columns: project.columns || [],
        member_ids: project.memberIds || [],
        is_archived: Boolean(project.isArchived),
        created_at: project.createdAt || new Date().toISOString(),
      };

      const { error } = await client.from('projects').upsert(payload);
      if (error && !error.message?.includes('does not exist')) {
        console.warn('[SupabaseService] Erro ao gravar projeto:', error);
        return { success: false, error: error.message };
      }
      return { success: true, project };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  static async createWorkspace(workspace: Workspace): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const wsPayload: any = {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug || workspace.name.toLowerCase().replace(/\s+/g, '-'),
        description: workspace.description || '',
        logo_color: workspace.logoColor || '#173653',
        owner_id: workspace.ownerId,
        tenant_id: workspace.companyId || (workspace as any).tenantId || null,
        created_at: workspace.createdAt || new Date().toISOString(),
      };

      const { error: wsError } = await client.from('workspaces').upsert(wsPayload);
      if (wsError && !wsError.message?.includes('does not exist')) {
        console.error('[SupabaseService] Erro ao persistir workspace:', wsError);
      }

      // Insere o criador/membros
      if (Array.isArray(workspace.members) && workspace.members.length > 0) {
        const memPayload = workspace.members.map((m) => ({
          workspace_id: workspace.id,
          user_id: m.userId,
          role: m.role || 'owner',
          joined_at: m.joinedAt || new Date().toISOString(),
        }));
        const { error: mError } = await client.from('workspace_members').upsert(memPayload);
        if (mError && !mError.message?.includes('does not exist')) {
          console.warn('[SupabaseService] Erro ao persistir workspace_members:', mError);
        }
      }

      return { success: true, workspace };
    } catch (err: any) {
      console.error('[SupabaseService] Falha ao criar workspace no Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  static async deleteWorkspace(workspaceId: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      await client.from('workspaces').delete().eq('id', workspaceId);
      await client.from('workspace_members').delete().eq('workspace_id', workspaceId);
      return { success: true };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro ao excluir workspace no Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  static async upsertWorkspaceMember(workspaceId: string, userId: string, role: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      await client.from('workspace_members').upsert({
        workspace_id: workspaceId,
        user_id: userId,
        role: role,
        joined_at: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.warn('[SupabaseService] Erro ao sincronizar membro:', e);
      return false;
    }
  }

  static async removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      await client.from('workspace_members').delete().match({
        workspace_id: workspaceId,
        user_id: userId,
      });
      return true;
    } catch (e) {
      console.warn('[SupabaseService] Erro ao remover membro:', e);
      return false;
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
          ficha_tecnica: t.fichaTecnica || null,
          production_records: t.productionRecords || [],
          frame_color: t.frameColor || null,
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

  // ==========================================================================
  // Planos de Assinatura (Subscription Plans) CRUD
  // ==========================================================================
  static async fetchSubscriptionPlans(): Promise<{ success: boolean; plans: SubscriptionPlan[]; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, plans: DEFAULT_SUBSCRIPTION_PLANS, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await client
        .from('subscription_plans')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        if (!error.message?.includes('does not exist')) {
          console.warn('[SupabaseService] Erro ao buscar planos de assinatura:', error);
        }
        return { success: false, plans: DEFAULT_SUBSCRIPTION_PLANS, error: error.message };
      }

      if (!data || data.length === 0) {
        await this.seedDefaultSubscriptionPlans();
        return { success: true, plans: DEFAULT_SUBSCRIPTION_PLANS };
      }

      const mapped: SubscriptionPlan[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        badge: row.badge || '',
        description: row.description || '',
        priceMonthly: Number(row.price_monthly ?? 0),
        priceAnnual: Number(row.price_annual ?? 0),
        stripeMonthlyPriceId: row.stripe_monthly_price_id || '',
        stripeAnnualPriceId: row.stripe_annual_price_id || '',
        maxUsers: Number(row.max_users ?? 5),
        maxBoards: Number(row.max_boards ?? 3),
        features: Array.isArray(row.features) ? row.features : [],
        modules: typeof row.modules === 'object' && row.modules !== null ? row.modules : {
          advancedReports: false,
          customAttachments: false,
          automations: false,
          unlimitedFichas: false,
          exportData: false,
          auditLog: false,
          prioritySupport: false,
        },
        popular: Boolean(row.popular),
        isActive: row.is_active !== false,
        orderIndex: Number(row.order_index ?? 0),
        updatedAt: row.updated_at || new Date().toISOString(),
      }));

      return { success: true, plans: mapped };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro ao buscar subscription_plans:', err);
      return { success: false, plans: DEFAULT_SUBSCRIPTION_PLANS, error: err.message };
    }
  }

  static async seedDefaultSubscriptionPlans(): Promise<void> {
    const client = this.getClient();
    if (!client) return;
    try {
      for (const p of DEFAULT_SUBSCRIPTION_PLANS) {
        await client.from('subscription_plans').upsert({
          id: p.id,
          name: p.name,
          badge: p.badge,
          description: p.description,
          price_monthly: p.priceMonthly,
          price_annual: p.priceAnnual,
          stripe_monthly_price_id: p.stripeMonthlyPriceId || null,
          stripe_annual_price_id: p.stripeAnnualPriceId || null,
          max_users: p.maxUsers,
          max_boards: p.maxBoards,
          features: p.features,
          modules: p.modules,
          popular: p.popular || false,
          is_active: p.isActive,
          order_index: p.orderIndex,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('[SupabaseService] Aviso ao semear planos padrões no Supabase:', e);
    }
  }

  static async saveSubscriptionPlan(plan: SubscriptionPlan): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      const payload: any = {
        id: plan.id,
        name: plan.name,
        badge: plan.badge,
        description: plan.description,
        price_monthly: plan.priceMonthly,
        price_annual: plan.priceAnnual,
        stripe_monthly_price_id: plan.stripeMonthlyPriceId || null,
        stripe_annual_price_id: plan.stripeAnnualPriceId || null,
        max_users: plan.maxUsers,
        max_boards: plan.maxBoards,
        features: plan.features,
        modules: plan.modules,
        popular: Boolean(plan.popular),
        is_active: plan.isActive,
        order_index: plan.orderIndex,
        updated_at: new Date().toISOString(),
      };

      const { error } = await client.from('subscription_plans').upsert(payload);
      if (error) {
        console.warn('[SupabaseService] Erro ao salvar subscription_plan:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Limpeza em cascata de dados de teste no Supabase (Preservando Master e Matriz)
   */
  static async resetTestDataOnSupabase(): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      // 1. Apaga tarefas/cards de teste (não pertencentes a ws-principal)
      await client.from('tasks').delete().neq('workspace_id', 'ws-principal');
      await client.from('cards').delete().neq('workspace_id', 'ws-principal');

      // 2. Apaga projetos que não sejam o principal
      await client.from('projects').delete().neq('workspace_id', 'ws-principal');

      // 3. Apaga membros que não sejam o Master
      await client.from('workspace_members').delete().neq('user_id', 'user-master-alan');

      // 4. Apaga workspaces de teste (mantendo ws-principal)
      await client.from('workspaces').delete().neq('id', 'ws-principal');

      // 5. Apaga tenants de teste (mantendo tenant-matriz)
      await client.from('tenants').delete().neq('id', 'tenant-matriz');

      // 6. Apaga perfis de teste na tabela profiles (mantendo master)
      await client
        .from('profiles')
        .delete()
        .neq('id', 'user-master-alan')
        .not('email', 'in', '("alanvitordasilva@gmail.com.br","alanvitordasilva@gmail.com")');

      // 7. Apaga fichas técnicas de teste vinculadas a outros workspaces
      await client.from('fichas_tecnicas').delete().neq('workspace_id', 'ws-principal');

      return { success: true };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro ao limpar dados de teste no Supabase:', err);
      return { success: false, error: err.message };
    }
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
