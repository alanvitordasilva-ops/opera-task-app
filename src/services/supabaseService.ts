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
  ClientCompany,
  PaymentStatus,
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
        if (!profile && authUser.email) {
          const { data: pByEmail } = await client
            .from('profiles')
            .select('*')
            .eq('email', authUser.email.toLowerCase())
            .maybeSingle();
          profile = pByEmail;
        }
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

      const tipo: ProfileTipo =
        (profile?.tipo as ProfileTipo) ||
        (authUser.user_metadata?.tipo as ProfileTipo) ||
        'membro';
      const isMaster =
        tipo === 'master' ||
        authUser.email === 'alanvitordasilva@gmail.com.br' ||
        authUser.email === 'alanvitordasilva@gmail.com' ||
        authUser.email?.startsWith('alanvitordasilva@') ||
        cleanIdentWithoutAt === 'alan';

      const resolvedCompanyId =
        profile?.company_id ||
        profile?.tenant_id ||
        authUser.user_metadata?.company_id ||
        authUser.user_metadata?.tenant_id ||
        undefined;
      const resolvedWorkspaceId =
        profile?.workspace_id ||
        authUser.user_metadata?.workspace_id ||
        undefined;
      const resolvedWorkspaceIds: string[] | undefined = Array.isArray(authUser.user_metadata?.workspace_ids)
        ? authUser.user_metadata.workspace_ids.filter(Boolean)
        : resolvedWorkspaceId
        ? [resolvedWorkspaceId]
        : undefined;
      const resolvedUsername =
        profile?.username ||
        authUser.user_metadata?.username ||
        (rawIdent.includes('@') ? cleanIdent : cleanIdentWithoutAt);

      const userObj: User = {
        id: authUser.id,
        name: profile?.nome || authUser.user_metadata?.nome || authUser.email?.split('@')[0] || 'Usuário',
        username: resolvedUsername,
        email: authUser.email || targetEmail,
        avatarColor: profile?.avatar_url || authUser.user_metadata?.avatar_url || '#34B1AC',
        title: roleTitleMap[tipo] || 'Membro da Equipe',
        systemRole: isMaster ? 'master' : 'user',
        isSuperAdmin: isMaster,
        tipo: tipo,
        companyId: resolvedCompanyId,
        tenantId: resolvedCompanyId,
        workspaceId: resolvedWorkspaceId,
        workspaceIds: resolvedWorkspaceIds,
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
    workspaceIds?: string[];
    companyId?: string;
    tenantId?: string;
    avatarColor?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não está configurado.' };
    }

    const cleanName = params.name.trim();
    // Preserva o caractere @ obrigatório no login
    const cleanUsername = params.username.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9._@+-]/g, '');
    const cleanEmail = (
      params.email ||
      (cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@operatask.app`)
    )
      .trim()
      .toLowerCase();
    const cleanPassword = params.password.trim();
    const targetWsIds =
      Array.isArray(params.workspaceIds) && params.workspaceIds.length > 0
        ? Array.from(new Set(params.workspaceIds.map((w) => w.trim()).filter(Boolean)))
        : params.workspaceId?.trim()
        ? [params.workspaceId.trim()]
        : [];
    const targetWsId = targetWsIds[0] || '';
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
      const config = this.getConfig();
      // Cria um cliente isolado sem persistência de sessão para não alterar nem deslogar o Administrador
      const isolatedAuthClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      // 1. Cadastra usuário no Supabase Auth uma única vez com metadados de tenant e workspace
      const { data: authData, error: authErr } = await isolatedAuthClient.auth.signUp({
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
            workspace_ids: targetWsIds,
          },
        },
      });

      if (authErr) {
        const msg = authErr.message?.toLowerCase() || '';
        // Se o usuário já existir no auth, continua para localizar ID e garantir vínculos
        if (!msg.includes('already registered') && !msg.includes('already exists')) {
          return { success: false, error: authErr.message };
        }
      }

      let userId = authData?.user?.id;
      if (!userId) {
        try {
          const { data: existingProf } = await client
            .from('profiles')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();
          if (existingProf?.id) {
            userId = existingProf.id;
          }
        } catch {}
      }
      if (!userId) {
        userId = `user-sb-${Date.now()}`;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      // 2. Garante gravação direta na tabela profiles apenas se userId for UUID válido (FK auth.users)
      if (isUuid) {
        try {
          const profilePayload: any = {
            id: userId,
            nome: cleanName,
            username: cleanUsername,
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
            // Fallback mantendo tenant_id, company_id e workspace_id (remove apenas username se ausente no schema)
            const { error: pError2 } = await client.from('profiles').upsert({
              id: userId,
              nome: cleanName,
              email: cleanEmail,
              tipo: params.tipo,
              avatar_url: chosenColor,
              tenant_id: effectiveTenantId || targetWsId || null,
              company_id: effectiveTenantId || targetWsId || null,
              workspace_id: targetWsId || null,
              created_at: new Date().toISOString(),
            });
            if (pError2 && (pError2.message?.includes('column') || pError2.message?.includes('does not exist'))) {
              await client.from('profiles').upsert({
                id: userId,
                nome: cleanName,
                email: cleanEmail,
                tipo: params.tipo,
                avatar_url: chosenColor,
                created_at: new Date().toISOString(),
              });
            }
          }
        } catch (pErr) {
          console.warn('[Supabase] Aviso ao gravar na tabela profiles:', pErr);
        }
      }

      // 3. Vincula imediatamente em TODOS os workspaces selecionados na tabela workspace_members
      if (targetWsIds.length > 0) {
        for (const wsId of targetWsIds) {
          await this.upsertWorkspaceMember(wsId, userId, params.tipo);
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
        workspaceId: targetWsId || undefined,
        workspaceIds: targetWsIds.length > 0 ? targetWsIds : undefined,
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
    userIdentifiers?: string[];
    userWorkspaceIds?: string[];
    isSuperAdmin?: boolean;
  }): Promise<{ success: boolean; workspaces: Workspace[]; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, workspaces: [], error: 'Supabase não conectado' };
    }

    try {
      const lookupIds = Array.from(
        new Set(
          [
            params?.userId,
            ...(params?.userIdentifiers || []),
          ]
            .filter((v): v is string => Boolean(v && v.trim()))
            .map((v) => v.trim())
        )
      );
      const lookupIdsLower = new Set(lookupIds.map((v) => v.toLowerCase()));

      let memberWsIds: string[] = [];
      if (lookupIds.length > 0 && !params?.isSuperAdmin) {
        try {
          const { data: memberRows } = await client
            .from('workspace_members')
            .select('workspace_id')
            .in('user_id', lookupIds);
          if (memberRows && memberRows.length > 0) {
            memberWsIds = memberRows.map((r: any) => String(r.workspace_id)).filter(Boolean);
          }
        } catch (e) {
          console.warn('[SupabaseService] Erro ao buscar vínculos em workspace_members:', e);
        }
      }

      // Consulta direta da tabela workspaces ordenando por order_index (se existir) e criação
      let wsResult: any = await client
        .from('workspaces')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (wsResult?.error && wsResult.error.message?.includes('order_index')) {
        wsResult = await client
          .from('workspaces')
          .select('*')
          .order('created_at', { ascending: true });
      }

      const allWsRows: any[] = Array.isArray(wsResult?.data) ? wsResult.data : [];
      const wsErr = wsResult?.error;

      if (wsErr && allWsRows.length === 0) {
        if (!wsErr.message?.includes('does not exist')) {
          console.warn('[SupabaseService] Erro ao buscar workspaces no Supabase:', wsErr);
        }
        return { success: false, workspaces: [], error: wsErr.message };
      }

      // Busca todos os vínculos de membros para enriquecer os workspaces e validar permissões
      let memberRows: any[] = [];
      try {
        const { data: mData } = await client.from('workspace_members').select('*');
        if (mData) memberRows = mData;
      } catch (e) {
        console.warn('[SupabaseService] Erro ao buscar membros de workspaces:', e);
      }

      // Complementa memberWsIds usando comparação case-insensitive nos memberRows carregados
      if (lookupIdsLower.size > 0 && memberRows.length > 0) {
        memberRows.forEach((m: any) => {
          const uid = String(m.user_id || '').trim().toLowerCase();
          if (uid && (lookupIdsLower.has(uid) || lookupIdsLower.has(uid.replace(/^@/, '')))) {
            if (m.workspace_id && !memberWsIds.includes(String(m.workspace_id))) {
              memberWsIds.push(String(m.workspace_id));
            }
          }
        });
      }

      let wsRows: any[] = allWsRows;

      // Filtragem estrita multi-tenant por permissões do usuário
      const targetTenantId = params?.tenantId || params?.companyId;
      const explicitUserWsIds = new Set<string>(
        [
          ...(params?.userWorkspaceIds || []),
          ...(params?.workspaceId && params.workspaceId !== 'ws-principal' ? [params.workspaceId] : []),
        ].filter(Boolean)
      );

      if (!params?.isSuperAdmin && wsRows.length > 0) {
        const filtered = wsRows.filter((row: any) => {
          const rowId = String(row.id);
          const ownerNorm = String(row.owner_id || '').trim().toLowerCase();
          // 1. É proprietário/criador
          if (ownerNorm && (lookupIdsLower.has(ownerNorm) || lookupIdsLower.has(ownerNorm.replace(/^@/, '')))) {
            return true;
          }
          // 2. É membro registrado na tabela workspace_members
          if (memberWsIds.includes(rowId)) return true;
          // 3. Vínculo explícito nos metadados do usuário
          if (explicitUserWsIds.has(rowId)) return true;
          // 4. Vínculo por Empresa / Tenant (nunca casa client-matriz genérico a menos que o usuário seja da matriz)
          if (targetTenantId) {
            if (String(row.tenant_id) === String(targetTenantId)) return true;
            if (String(row.company_id) === String(targetTenantId)) return true;
            if (rowId === String(targetTenantId)) return true;
          }
          return false;
        });

        wsRows = filtered;
      }

      if (wsRows.length === 0) {
        return { success: true, workspaces: [] };
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
          orderIndex: typeof row.order_index === 'number' ? row.order_index : undefined,
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

  static async updateProject(projectId: string, updates: Partial<Project>): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.icon !== undefined) payload.icon = updates.icon;
      if (updates.columns !== undefined) payload.columns = updates.columns;
      if (updates.memberIds !== undefined) payload.member_ids = updates.memberIds;
      if (updates.isArchived !== undefined) payload.is_archived = updates.isArchived;

      const { error } = await client.from('projects').update(payload).eq('id', projectId);
      if (error && !error.message?.includes('does not exist')) {
        console.warn('[SupabaseService] Erro ao atualizar projeto:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  static async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      // Limpa cards/tarefas vinculadas ao projeto
      await client.from('cards').delete().eq('project_id', projectId);
      await client.from('tasks').delete().eq('project_id', projectId);
      const { error } = await client.from('projects').delete().eq('id', projectId);
      if (error && !error.message?.includes('does not exist')) {
        console.warn('[SupabaseService] Erro ao excluir projeto no Supabase:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro ao excluir projeto no Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  static async createWorkspace(workspace: Workspace): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const targetCompId = workspace.companyId || (workspace as any).tenantId || workspace.id;
      const baseSlug = (workspace.slug || workspace.name || 'workspace')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'workspace';
      const safeSlug = `${baseSlug}-${workspace.id.slice(-5)}`;

      // 1. Garante que o Tenant / Empresa existe na tabela tenants SEM sobrescrever empresa já existente
      try {
        const { data: existingTenant } = await client
          .from('tenants')
          .select('id')
          .eq('id', targetCompId)
          .maybeSingle();

        if (!existingTenant) {
          const { error: tErr } = await client.from('tenants').upsert({
            id: targetCompId,
            name: workspace.name,
            owner_id: workspace.ownerId,
            owner_name: workspace.name,
            owner_email: 'contato@operatask.com',
            primary_workspace_id: workspace.id,
            status: workspace.clientStatus || 'active',
            plan: workspace.clientPlan || 'profissional',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          });
          if (tErr) {
            console.warn('[SupabaseService] Aviso ao criar tenant para workspace:', tErr.message);
          }
        }
      } catch (tErr) {
        console.warn('[SupabaseService] Aviso ao garantir tenant para workspace:', tErr);
      }

      // 2. Monta payload do Workspace gravando tanto tenant_id quanto company_id com fallbacks progressivos
      const buildWsPayload = (
        includeCompanyId: boolean,
        includeTenantId: boolean,
        slugVal: string,
        minimal = false,
        includeOrder = true
      ): any => {
        if (minimal) {
          return {
            id: workspace.id,
            name: workspace.name,
            slug: slugVal,
            owner_id: workspace.ownerId,
            created_at: workspace.createdAt || new Date().toISOString(),
          };
        }
        const payload: any = {
          id: workspace.id,
          name: workspace.name,
          slug: slugVal,
          description: workspace.description || '',
          logo_color: workspace.logoColor || '#173653',
          owner_id: workspace.ownerId,
          created_at: workspace.createdAt || new Date().toISOString(),
        };
        if (includeOrder && typeof workspace.orderIndex === 'number') {
          payload.order_index = workspace.orderIndex;
        }
        if (includeTenantId) payload.tenant_id = targetCompId;
        if (includeCompanyId) payload.company_id = targetCompId;
        return payload;
      };

      let currentSlug = safeSlug;
      let wsResult = await client.from('workspaces').upsert(buildWsPayload(true, true, currentSlug));

      if (wsResult.error && wsResult.error.message?.includes('order_index')) {
        wsResult = await client.from('workspaces').upsert(buildWsPayload(true, true, currentSlug, false, false));
      }

      if (wsResult.error && wsResult.error.message?.includes('company_id')) {
        wsResult = await client.from('workspaces').upsert(buildWsPayload(false, true, currentSlug, false, false));
      }

      if (
        wsResult.error &&
        (wsResult.error.message?.includes('tenant_id') ||
          wsResult.error.message?.includes('foreign key') ||
          wsResult.error.code === '23503')
      ) {
        wsResult = await client.from('workspaces').upsert(buildWsPayload(false, false, currentSlug, false, false));
      }

      if (wsResult.error && (wsResult.error.code === '23505' || wsResult.error.message?.includes('slug'))) {
        currentSlug = `${baseSlug}-${Date.now().toString(36)}`;
        wsResult = await client.from('workspaces').upsert(buildWsPayload(false, false, currentSlug, false, false));
      }

      if (wsResult.error && wsResult.error.message?.includes('column')) {
        wsResult = await client.from('workspaces').upsert(buildWsPayload(false, false, currentSlug, true, false));
      }

      if (wsResult.error && !wsResult.error.message?.includes('does not exist')) {
        console.error('[SupabaseService] Erro ao persistir workspace no Supabase:', wsResult.error);
        return { success: false, workspace, error: wsResult.error.message };
      }

      // 3. VINCULAÇÃO AUTOMÁTICA OBRIGATÓRIA NO CADASTRO/CRIAÇÃO:
      // O criador (ownerId) e todos os membros são obrigatoriamente vinculados na tabela workspace_members
      const membersToUpsert: Array<{ workspace_id: string; user_id: string; role: string; joined_at: string }> = [];

      if (workspace.ownerId) {
        membersToUpsert.push({
          workspace_id: workspace.id,
          user_id: workspace.ownerId,
          role: 'owner',
          joined_at: workspace.createdAt || new Date().toISOString(),
        });
      }

      if (Array.isArray(workspace.members)) {
        workspace.members.forEach((m) => {
          if (m.userId && !membersToUpsert.some((x) => x.user_id === m.userId)) {
            membersToUpsert.push({
              workspace_id: workspace.id,
              user_id: m.userId,
              role: m.role || 'membro',
              joined_at: m.joinedAt || new Date().toISOString(),
            });
          }
        });
      }

      if (membersToUpsert.length > 0) {
        const { error: mError } = await client
          .from('workspace_members')
          .upsert(membersToUpsert, { onConflict: 'workspace_id,user_id' });
        if (mError && !mError.message?.includes('does not exist')) {
          console.warn('[SupabaseService] Erro no upsert em lote de workspace_members, tentando individualmente:', mError.message);
          for (const memberRow of membersToUpsert) {
            try {
              await client.from('workspace_members').upsert(memberRow, { onConflict: 'workspace_id,user_id' });
            } catch {}
          }
        }
      }

      // 4. Atualiza perfil do criador/dono com o ID do workspace e da empresa (apenas se ownerId for UUID válido)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        workspace.ownerId || ''
      );
      if (isUuid) {
        try {
          await client
            .from('profiles')
            .update({
              workspace_id: workspace.id,
              tenant_id: targetCompId,
              company_id: targetCompId,
            })
            .eq('id', workspace.ownerId);
        } catch {}
      }

      return { success: true, workspace: { ...workspace, slug: currentSlug } };
    } catch (err: any) {
      console.error('[SupabaseService] Falha ao criar workspace no Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  static async updateWorkspace(
    workspaceId: string,
    updates: Partial<Workspace>
  ): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.slug !== undefined) payload.slug = updates.slug;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.logoColor !== undefined) payload.logo_color = updates.logoColor;
      if (typeof updates.orderIndex === 'number') payload.order_index = updates.orderIndex;

      if (Object.keys(payload).length === 0) {
        return { success: true };
      }

      let { error } = await client.from('workspaces').update(payload).eq('id', workspaceId);

      if (error && (error.message?.includes('order_index') || error.message?.includes('column'))) {
        const { order_index: _ignored, ...withoutOrder } = payload;
        if (Object.keys(withoutOrder).length > 0) {
          const retry = await client.from('workspaces').update(withoutOrder).eq('id', workspaceId);
          error = retry.error;
        } else {
          error = null;
        }
      }

      if (error && !error.message?.includes('does not exist')) {
        console.warn('[SupabaseService] Erro ao atualizar workspace:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro ao atualizar workspace no Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  static async updateWorkspacesOrder(
    items: Array<{ id: string; orderIndex: number }>
  ): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      for (const item of items) {
        const { error } = await client
          .from('workspaces')
          .update({ order_index: item.orderIndex })
          .eq('id', item.id);
        if (error && error.message?.includes('order_index')) {
          // Coluna ainda não existe no Supabase do projeto; ordem permanece persistida localmente e no servidor /api/sync/state
          return { success: true };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async deleteWorkspace(workspaceId: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      // Limpeza em cascata no banco de dados para evitar registros órfãos
      await client.from('cards').delete().eq('workspace_id', workspaceId);
      await client.from('tasks').delete().eq('workspace_id', workspaceId);
      await client.from('fichas_tecnicas').delete().eq('workspace_id', workspaceId);
      await client.from('projects').delete().eq('workspace_id', workspaceId);
      await client.from('workspace_members').delete().eq('workspace_id', workspaceId);
      await client.from('workspaces').delete().eq('id', workspaceId);
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
      const payload = {
        workspace_id: workspaceId,
        user_id: userId,
        role: role,
        joined_at: new Date().toISOString(),
      };
      const { error } = await client
        .from('workspace_members')
        .upsert(payload, { onConflict: 'workspace_id,user_id' });

      if (error) {
        console.warn('[SupabaseService] Aviso upsert workspace_members, tentando select+update/insert:', error.message);
        const { data: existing } = await client
          .from('workspace_members')
          .select('workspace_id, user_id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          const { error: updErr } = await client
            .from('workspace_members')
            .update({ role })
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId);
          return !updErr;
        } else {
          const { error: insErr } = await client.from('workspace_members').insert(payload);
          return !insErr;
        }
      }
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
        const wsPayload = data.workspaces.map((w, idx) => {
          const targetCompId = w.companyId || (w as any).tenantId || w.id;
          return {
            id: w.id,
            name: w.name,
            slug: w.slug || w.name.toLowerCase().replace(/\s+/g, '-'),
            description: w.description || '',
            logo_color: w.logoColor || '#173653',
            owner_id: w.ownerId,
            tenant_id: targetCompId,
            company_id: targetCompId,
            order_index: typeof w.orderIndex === 'number' ? w.orderIndex : idx,
            created_at: w.createdAt || new Date().toISOString(),
          };
        });

        let wsErr = (await client.from('workspaces').upsert(wsPayload)).error;
        if (wsErr && wsErr.message?.includes('order_index')) {
          const withoutOrder = wsPayload.map(({ order_index, ...rest }: any) => rest);
          wsErr = (await client.from('workspaces').upsert(withoutOrder)).error;
        }
        if (wsErr && wsErr.message?.includes('company_id')) {
          const fallbackWsPayload = wsPayload.map(({ company_id, order_index, ...rest }: any) => rest);
          wsErr = (await client.from('workspaces').upsert(fallbackWsPayload)).error;
        }
        if (wsErr && (wsErr.message?.includes('tenant_id') || wsErr.message?.includes('foreign key') || wsErr.code === '23503')) {
          const minimalPayload = wsPayload.map(({ company_id, tenant_id, order_index, ...rest }: any) => rest);
          wsErr = (await client.from('workspaces').upsert(minimalPayload)).error;
        }
        if (wsErr && !wsErr.message?.includes('does not exist')) {
          console.warn('Erro ao sincronizar workspaces no Supabase:', wsErr);
        }

        // Sincroniza workspace_members garantindo que o ownerId esteja presente
        for (const w of data.workspaces) {
          const membersList: Array<{ workspace_id: string; user_id: string; role: string; joined_at: string }> = [];
          if (w.ownerId) {
            membersList.push({
              workspace_id: w.id,
              user_id: w.ownerId,
              role: 'owner',
              joined_at: w.createdAt || new Date().toISOString(),
            });
          }
          if (Array.isArray(w.members)) {
            w.members.forEach((m) => {
              if (m.userId && !membersList.some((x) => x.user_id === m.userId)) {
                membersList.push({
                  workspace_id: w.id,
                  user_id: m.userId,
                  role: m.role || 'membro',
                  joined_at: m.joinedAt || new Date().toISOString(),
                });
              }
            });
          }
          if (membersList.length > 0) {
            await client.from('workspace_members').upsert(membersList, { onConflict: 'workspace_id,user_id' });
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

  // ==========================================================================
  // GESTÃO DE TENANTS / CLIENTES NO SUPABASE (MULTI-TENANT REAL & SINCRONIZAÇÃO)
  // ==========================================================================

  /**
   * Buscar lista completa de Tenants (Empresas / Clientes) no Supabase
   */
  static async fetchTenants(): Promise<{ success: boolean; clients: ClientCompany[]; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, clients: [], error: 'Supabase não conectado' };
    }

    try {
      const { data: tenantRows, error: tErr } = await client
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tErr) {
        if (!tErr.message?.includes('does not exist')) {
          console.warn('[SupabaseService] Erro ao buscar tenants:', tErr);
        }
        return { success: false, clients: [], error: tErr.message };
      }

      // Busca workspaces para mapear workspaceIds vinculados
      let workspaceRows: any[] = [];
      try {
        const { data: wsData } = await client.from('workspaces').select('id, tenant_id, company_id');
        if (wsData) workspaceRows = wsData;
      } catch {}

      const clients: ClientCompany[] = (tenantRows || []).map((row: any) => {
        const linkedWsIds = workspaceRows
          .filter((w: any) => w.tenant_id === row.id || w.company_id === row.id)
          .map((w: any) => String(w.id));

        const primaryWsId =
          row.primary_workspace_id ||
          linkedWsIds[0] ||
          (row.id === 'tenant-matriz' || row.id === 'client-matriz' ? 'ws-principal' : `ws-${row.id}`);
        const wsIds = Array.from(new Set([primaryWsId, ...linkedWsIds]));

        return {
          id: String(row.id),
          name: row.name || 'Empresa',
          legalName: row.legal_name || row.name,
          cnpjOrDoc: row.cnpj_or_doc || undefined,
          plan: row.plan || 'profissional',
          status: row.status || 'active',
          paymentStatus: (row.payment_status || 'paid') as PaymentStatus,
          primaryWorkspaceId: primaryWsId,
          workspaceIds: wsIds,
          ownerId: row.owner_id || 'user-master-alan',
          ownerName: row.owner_name || 'Administrador',
          ownerEmail: row.owner_email || 'admin@empresa.com',
          ownerPhone: row.owner_phone || undefined,
          createdAt: row.created_at || new Date().toISOString(),
          lastAccessAt: row.updated_at || row.created_at || new Date().toISOString(),
          planStartDate: row.plan_start_date || row.created_at || new Date().toISOString(),
          planExpiresAt: row.plan_expires_at || undefined,
          nextBillingDate: row.next_billing_date || undefined,
          stripeCustomerId: row.stripe_customer_id || undefined,
          stripeSubscriptionId: row.stripe_subscription_id || undefined,
          maxUsers: row.max_users || 30,
          monthlyFee: 0,
          notes: row.notes || undefined,
        };
      });

      return { success: true, clients };
    } catch (err: any) {
      console.warn('[SupabaseService] Erro inesperado ao buscar tenants:', err);
      return { success: false, clients: [], error: err.message };
    }
  }

  /**
   * Salvar ou atualizar um Tenant individual no Supabase
   */
  static async saveTenant(tenant: ClientCompany): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    try {
      const payload = {
        id: tenant.id,
        name: tenant.name,
        legal_name: tenant.legalName || tenant.name,
        cnpj_or_doc: tenant.cnpjOrDoc || null,
        plan: tenant.plan || 'profissional',
        status: tenant.status || 'active',
        payment_status: tenant.paymentStatus || 'paid',
        owner_id: tenant.ownerId,
        owner_name: tenant.ownerName,
        owner_email: tenant.ownerEmail,
        owner_phone: tenant.ownerPhone || null,
        primary_workspace_id: tenant.primaryWorkspaceId,
        max_users: tenant.maxUsers || 30,
        plan_start_date: tenant.planStartDate || new Date().toISOString(),
        plan_expires_at: tenant.planExpiresAt || null,
        next_billing_date: tenant.nextBillingDate || null,
        stripe_customer_id: tenant.stripeCustomerId || null,
        stripe_subscription_id: tenant.stripeSubscriptionId || null,
        notes: tenant.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await client.from('tenants').upsert(payload);
      if (error) {
        console.warn('[SupabaseService] Erro ao fazer upsert em tenants:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sincronizar múltiplos tenants no Supabase
   */
  static async upsertTenants(tenants: ClientCompany[]): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client || !tenants.length) return { success: false, error: 'Supabase não conectado' };

    try {
      const payloads = tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        legal_name: tenant.legalName || tenant.name,
        cnpj_or_doc: tenant.cnpjOrDoc || null,
        plan: tenant.plan || 'profissional',
        status: tenant.status || 'active',
        payment_status: tenant.paymentStatus || 'paid',
        owner_id: tenant.ownerId,
        owner_name: tenant.ownerName,
        owner_email: tenant.ownerEmail,
        owner_phone: tenant.ownerPhone || null,
        primary_workspace_id: tenant.primaryWorkspaceId,
        max_users: tenant.maxUsers || 30,
        plan_start_date: tenant.planStartDate || new Date().toISOString(),
        plan_expires_at: tenant.planExpiresAt || null,
        next_billing_date: tenant.nextBillingDate || null,
        stripe_customer_id: tenant.stripeCustomerId || null,
        stripe_subscription_id: tenant.stripeSubscriptionId || null,
        notes: tenant.notes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client.from('tenants').upsert(payloads);
      if (error) {
        console.warn('[SupabaseService] Erro ao sincronizar lista de tenants:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Excluir Tenant no Supabase
   */
  static async deleteTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };
    if (tenantId === 'tenant-matriz' || tenantId === 'client-matriz') {
      return { success: false, error: 'A Matriz não pode ser excluída.' };
    }

    try {
      const { error } = await client.from('tenants').delete().eq('id', tenantId);
      if (error) {
        console.warn('[SupabaseService] Erro ao excluir tenant:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
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
