/**
 * Utilitário central para resolução de URL de Produção do OperaTask.
 * Garante que links de convite e credenciais enviados por WhatsApp ou E-mail
 * sempre apontem para o ambiente de produção público acessível por smartphones.
 */

export const PRODUCTION_APP_URL = 'https://opera-task-app.vercel.app';

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
