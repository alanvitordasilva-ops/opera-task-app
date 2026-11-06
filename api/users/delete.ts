import { getServerStore } from '../_store.js';
import { adminDeleteUser } from '../_supabaseAdmin.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ success: false, error: 'ID do usuário é obrigatório.' });
  }

  // 1. Exclusão administrativa no Supabase com chave secreta de serviço
  try {
    await adminDeleteUser(id);
  } catch (err) {
    console.warn('[OperaTask] Supabase admin delete aviso:', err);
  }

  // 2. Remove da base de dados do servidor
  const store = getServerStore();
  store.users = store.users.filter((u) => u.id !== id);
  if (Array.isArray(store.workspaces)) {
    store.workspaces.forEach((w) => {
      if (Array.isArray(w.members)) {
        w.members = w.members.filter((m: any) => m.userId !== id);
      }
    });
  }

  return res.status(200).json({
    success: true,
    users: store.users,
    workspaces: store.workspaces,
  });
}
