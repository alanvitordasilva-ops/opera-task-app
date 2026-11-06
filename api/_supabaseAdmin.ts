import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _cachedAdminClient: SupabaseClient | null = null;

/**
 * Retorna o cliente administrativo do Supabase usando exclusivamente a chave secreta de serviço.
 * Deve ser executado APENAS no servidor (funções serverless da Vercel ou rotas do backend).
 * Variável de ambiente: process.env.SUPABASE_SERVICE_ROLE_KEY
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (_cachedAdminClient) return _cachedAdminClient;

  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();

  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  try {
    _cachedAdminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return _cachedAdminClient;
  } catch (err) {
    console.error('[Supabase Admin] Erro ao instanciar cliente com SUPABASE_SERVICE_ROLE_KEY:', err);
    return null;
  }
}

/**
 * Função administrativa segura no servidor para criação/gestão de novos usuários.
 * Utiliza exclusivamente o cliente de servidor com SUPABASE_SERVICE_ROLE_KEY para:
 * 1. Criar o usuário no Supabase Auth com email_confirm: true (acesso imediato sem bloqueio por email).
 * 2. Gravar o perfil na tabela 'profiles' (bypassa RLS de forma segura).
 * 3. Vincular o usuário aos workspaces na tabela 'workspace_members'.
 */
export async function adminRegisterOrSyncUser(userData: {
  id?: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  workspaceIds?: string[];
  avatarColor?: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' };
  }

  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanPassword = (userData.password || '').trim();

  try {
    let authUserId = userData.id;

    if (cleanPassword) {
      // Criação direta e confirmada via auth.admin usando a chave service_role
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          nome: userData.name,
          name: userData.name,
          username: userData.username,
          tipo: userData.role,
          avatar_url: userData.avatarColor || '#34B1AC',
        },
      });

      if (createData?.user?.id) {
        authUserId = createData.user.id;
      } else if (createErr) {
        // Se usuário já existe, atualiza senha e metadados com autoridade administrativa
        if (
          createErr.message?.toLowerCase().includes('already') ||
          createErr.message?.toLowerCase().includes('exists')
        ) {
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existingUser = listData?.users?.find(
            (u) => u.email?.toLowerCase() === cleanEmail
          );
          if (existingUser?.id) {
            authUserId = existingUser.id;
            await adminClient.auth.admin.updateUserById(existingUser.id, {
              password: cleanPassword,
              email_confirm: true,
              user_metadata: {
                nome: userData.name,
                name: userData.name,
                username: userData.username,
                tipo: userData.role,
                avatar_url: userData.avatarColor || '#34B1AC',
              },
            });
          }
        } else {
          console.warn('[Supabase Admin] Aviso auth.admin.createUser:', createErr.message);
        }
      }
    }

    const finalUserId = authUserId || userData.id;
    if (finalUserId) {
      // Grava no profiles
      await adminClient.from('profiles').upsert({
        id: finalUserId,
        nome: userData.name,
        email: cleanEmail,
        tipo: userData.role,
        avatar_url: userData.avatarColor || '#34B1AC',
        created_at: new Date().toISOString(),
      });

      // Vincula aos workspaces selecionados
      const wsList =
        userData.workspaceIds && userData.workspaceIds.length > 0
          ? userData.workspaceIds
          : ['ws-principal'];

      for (const wsId of wsList) {
        await adminClient.from('workspace_members').upsert({
          workspace_id: wsId,
          user_id: finalUserId,
          role: userData.role,
          joined_at: new Date().toISOString(),
        });
      }

      return { success: true, userId: finalUserId };
    }

    return { success: false, error: 'Não foi possível determinar o ID do usuário.' };
  } catch (err: any) {
    console.error('[Supabase Admin] Erro inesperado na função administrativa:', err);
    return { success: false, error: err.message || 'Erro no servidor Supabase Admin' };
  }
}

/**
 * Atualiza administrativamente dados do usuário (senha, tipo, metadados) no Supabase.
 */
export async function adminUpdateUser(
  userId: string,
  updates: {
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    avatarColor?: string;
  }
): Promise<boolean> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return false;

  try {
    const profileUpdates: any = {};
    if (updates.name) profileUpdates.nome = updates.name;
    if (updates.email) profileUpdates.email = updates.email;
    if (updates.role) profileUpdates.tipo = updates.role;
    if (updates.avatarColor) profileUpdates.avatar_url = updates.avatarColor;

    if (Object.keys(profileUpdates).length > 0) {
      await adminClient.from('profiles').update(profileUpdates).eq('id', userId);
    }

    if (updates.password || updates.name || updates.role) {
      const authUpdates: any = {};
      if (updates.password) authUpdates.password = updates.password;
      if (updates.name || updates.role || updates.avatarColor) {
        authUpdates.user_metadata = {
          ...(updates.name ? { nome: updates.name, name: updates.name } : {}),
          ...(updates.role ? { tipo: updates.role } : {}),
          ...(updates.avatarColor ? { avatar_url: updates.avatarColor } : {}),
        };
      }
      try {
        await adminClient.auth.admin.updateUserById(userId, authUpdates);
      } catch (authErr) {
        console.warn('[Supabase Admin] updateUserById aviso:', authErr);
      }
    }

    return true;
  } catch (err) {
    console.error('[Supabase Admin] Erro ao atualizar usuário:', err);
    return false;
  }
}

/**
 * Remove administrativamente o usuário no Supabase (perfis, vínculos e auth).
 */
export async function adminDeleteUser(userId: string): Promise<boolean> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return false;

  try {
    // 1. Remove de workspace_members
    await adminClient.from('workspace_members').delete().eq('user_id', userId);
    // 2. Remove de profiles
    await adminClient.from('profiles').delete().eq('id', userId);
    // 3. Remove de auth.users
    try {
      await adminClient.auth.admin.deleteUser(userId);
    } catch {}
    return true;
  } catch (err) {
    console.error('[Supabase Admin] Erro ao deletar usuário:', err);
    return false;
  }
}

