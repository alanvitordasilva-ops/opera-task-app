import { getServerStore, ServerUser } from '../_store.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getServerStore();

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, users: store.users });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const body = req.body || {};
  const { name, username, email, password, role, workspaceId, workspaceIds, avatarColor } = body;

  const cleanName = (name || '').trim();
  const cleanUsername = (username || '').trim().toLowerCase().replace(/^@/, '');
  const cleanEmail = (email || `${cleanUsername}@operatask.app`).trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanName || !cleanUsername) {
    return res.status(400).json({ success: false, error: 'Dados incompletos' });
  }

  const existing = store.users.find((u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Usuário ou e-mail já cadastrado' });
  }

  const newUser: ServerUser = {
    id: body.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    password: cleanPass,
    avatarColor: avatarColor || '#34B1AC',
    title: role === 'administrador' ? 'Administrador' : role === 'producao' ? 'Produção' : 'Membro da Equipe',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  store.users.push(newUser);

  // Vincula aos workspaces
  const targetWsIds: string[] = Array.isArray(workspaceIds) && workspaceIds.length > 0
    ? workspaceIds
    : workspaceId ? [workspaceId] : ['ws-principal'];

  targetWsIds.forEach((wsId) => {
    const ws = store.workspaces.find((w) => w.id === wsId);
    if (ws) {
      if (!ws.members.some((m: any) => m.userId === newUser.id)) {
        ws.members.push({
          userId: newUser.id,
          role: role || 'member',
          joinedAt: new Date().toISOString(),
        });
      }
    }
  });

  return res.status(200).json({
    success: true,
    user: newUser,
    users: store.users,
    workspaces: store.workspaces,
  });
}
