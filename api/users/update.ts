import { getServerStore } from '../_store.js';
import { adminUpdateUser } from '../_supabaseAdmin.js';

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

  const body = req.body || {};
  const { id } = body;
  if (!id) {
    return res.status(400).json({ success: false, error: 'ID do usuário é obrigatório.' });
  }

  // 1. Atualização administrativa no Supabase com chave secreta de serviço
  try {
    await adminUpdateUser(id, {
      name: body.name,
      username: body.username,
      email: body.email,
      password: body.password,
      role: body.tipo || body.role,
      avatarColor: body.avatarColor,
    });
  } catch (err) {
    console.warn('[OperaTask] Supabase admin update aviso:', err);
  }

  // 2. Atualiza no store do servidor
  const store = getServerStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx !== -1) {
    store.users[idx] = {
      ...store.users[idx],
      ...body,
      status: 'active',
      isActive: true,
    };
    return res.status(200).json({
      success: true,
      user: store.users[idx],
      users: store.users,
    });
  }

  return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
}
