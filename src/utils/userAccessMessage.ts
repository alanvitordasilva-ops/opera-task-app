/**
 * Utilitário central para geração e formatação da mensagem de compartilhamento
 * de credenciais de acesso aos novos usuários cadastrados no OperaTask.
 *
 * Modelo oficial obrigatório:
 *
 * Acesso ao OperaTask
 *
 * Olá, [Nome da pessoa cadastrada]!
 *
 * Sua conta foi criada e está 100% ativa para acesso imediato.
 *
 * Acesse o link:
 * https://opera-task-app.vercel.app
 *
 * Seus dados de acesso:
 * - Nome de usuário (login): [login definido pelo Master/Dono/Administrador]
 * - Senha: [senha definida no cadastro]
 * - Workspace: [nome do Workspace atribuído]
 * - Perfil: [tipo de membro — Produção, Membro, Visualizador, etc.]
 */

import { createInviteAccessUrl, getProductionAppUrl, OFFICIAL_APP_ACCESS_URL } from './appUrl.ts';

export { OFFICIAL_APP_ACCESS_URL };

export function formatUserProfileRole(role?: string): string {
  if (!role) return 'Membro';
  const lower = role.toLowerCase().trim();
  switch (lower) {
    case 'producao':
    case 'production':
      return 'Produção';
    case 'membro':
    case 'member':
      return 'Membro';
    case 'administrador':
    case 'admin':
      return 'Administrador';
    case 'dono':
    case 'owner':
      return 'Dono';
    case 'visualizador':
    case 'viewer':
      return 'Visualizador';
    case 'master':
      return 'Master';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

export interface UserAccessMessageParams {
  name: string;
  login: string;
  password: string;
  workspaceName: string;
  role: string;
  companyId?: string;
  workspaceId?: string;
  customLink?: string;
  token?: string;
}

/**
 * Gera a mensagem obrigatória padronizada de compartilhamento de credenciais.
 * Cria automaticamente o link de acesso isolado com query params de convite
 * para evitar qualquer login cruzado com sessões anteriores (ex: Master).
 */
export function generateUserAccessMessage({
  name,
  login,
  password,
  workspaceName,
  role,
  companyId,
  workspaceId,
  customLink,
  token,
}: UserAccessMessageParams): string {
  const profileLabel = formatUserProfileRole(role);

  let link: string;
  if (customLink && customLink.includes('invite=true')) {
    link = customLink;
  } else {
    link = createInviteAccessUrl({
      baseUrl: customLink || getProductionAppUrl(),
      companyId,
      workspaceId,
      workspaceName,
      login,
      token,
    });
  }

  return `Acesso ao OperaTask\n\nOlá, ${name}!\n\nSua conta foi criada e está 100% ativa para acesso imediato.\n\nAcesse o link:\n${link}\n\nSeus dados de acesso:\n- Nome de usuário (login): ${login}\n- Senha: ${password}\n- Workspace: ${workspaceName}\n- Perfil: ${profileLabel}`;
}

