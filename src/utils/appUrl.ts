/**
 * Utilitário central para resolução de URL de Produção do OperaTask.
 * Garante que links de convite e credenciais enviados por WhatsApp ou E-mail
 * sempre apontem para o ambiente de produção público acessível por smartphones.
 */

export const PRODUCTION_APP_URL = 'https://opera-task-app.vercel.app';
export const OFFICIAL_APP_ACCESS_URL = PRODUCTION_APP_URL;

export function getProductionAppUrl(): string {
  if (typeof window === 'undefined') return PRODUCTION_APP_URL;

  const origin = window.location.origin;

  // Se estiver em ambiente local ou preview de dev do Google Cloud Run (ais-dev-),
  // substitui para a URL pública oficial (ais-pre-) para que outros dispositivos e celulares consigam acessar sem bloqueio.
  if (
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('ais-dev-')
  ) {
    return PRODUCTION_APP_URL;
  }

  return origin;
}

export interface InviteUrlParams {
  baseUrl?: string;
  companyId?: string;
  workspaceId?: string;
  workspaceName?: string;
  login?: string;
  token?: string;
}

/**
 * Cria o link padronizado de convite/acesso com isolamento estrito de sessão
 */
export function createInviteAccessUrl({
  baseUrl,
  companyId,
  workspaceId,
  workspaceName,
  login,
  token,
}: InviteUrlParams): string {
  const base = (baseUrl || getProductionAppUrl()).trim();
  const safeBase = base.startsWith('http') ? base : `https://${base}`;
  const generatedToken = token || `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    const url = new URL(safeBase);
    url.searchParams.set('invite', 'true');
    url.searchParams.set('token', generatedToken);
    if (companyId) url.searchParams.set('company_id', companyId);
    if (workspaceId) url.searchParams.set('workspace_id', workspaceId);
    if (workspaceName) url.searchParams.set('ws_name', workspaceName);
    if (login) url.searchParams.set('login', login);
    return url.toString();
  } catch {
    const queryParts = [
      'invite=true',
      `token=${encodeURIComponent(generatedToken)}`,
    ];
    if (companyId) queryParts.push(`company_id=${encodeURIComponent(companyId)}`);
    if (workspaceId) queryParts.push(`workspace_id=${encodeURIComponent(workspaceId)}`);
    if (workspaceName) queryParts.push(`ws_name=${encodeURIComponent(workspaceName)}`);
    if (login) queryParts.push(`login=${encodeURIComponent(login)}`);

    const sep = safeBase.includes('?') ? '&' : '?';
    return `${safeBase}${sep}${queryParts.join('&')}`;
  }
}
