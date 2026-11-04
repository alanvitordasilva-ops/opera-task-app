import { getServerStore, ServerUser, INITIAL_USERS } from '../_store.js';

function normalize(str?: string) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/^@/, '');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { identifier, password } = req.body || {};
  const cleanIdent = normalize(identifier);
  const cleanPass = (password || '').trim();

  const store = getServerStore();
  const users = store.users;

  // Master check
  if (
    cleanIdent === 'alan' ||
    cleanIdent === 'alanvitordasilva@gmail.com.br' ||
    cleanIdent === 'alanvitordasilva@gmail.com'
  ) {
    if (cleanPass === '273021') {
      const masterUser = users.find((u) => u.systemRole === 'master') || INITIAL_USERS[0];
      return res.status(200).json({
        success: true,
        user: masterUser,
        allUsers: users,
        workspaces: store.workspaces,
        projects: store.projects,
        tasks: store.tasks,
      });
    } else {
      return res.status(401).json({ success: false, error: 'Senha inválida' });
    }
  }

  const found = users.find((u) => {
    const uUser = normalize(u.username);
    const uEmail = normalize(u.email);
    const uEmailPrefix = uEmail.split('@')[0];
    return uUser === cleanIdent || uEmail === cleanIdent || uEmailPrefix === cleanIdent;
  });

  if (!found) {
    return res.status(404).json({
      success: false,
      error: 'Conta não encontrada',
      debug: `Usuário '${cleanIdent}' não localizado entre ${users.length} cadastrados.`,
    });
  }

  if (found.password && found.password.trim() !== cleanPass) {
    return res.status(401).json({ success: false, error: 'Senha incorreta' });
  }

  const activeUser = { ...found, status: 'active', isActive: true };
  return res.status(200).json({
    success: true,
    user: activeUser,
    allUsers: users,
    workspaces: store.workspaces,
    projects: store.projects,
    tasks: store.tasks,
  });
}
