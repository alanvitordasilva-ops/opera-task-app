import { getServerStore } from '../_store.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getServerStore();

  if (req.method === 'POST') {
    const body = req.body || {};
    if (Array.isArray(body.users)) store.users = body.users;
    if (Array.isArray(body.workspaces)) store.workspaces = body.workspaces;
    if (Array.isArray(body.projects)) store.projects = body.projects;
    if (Array.isArray(body.tasks)) store.tasks = body.tasks;
    return res.status(200).json({ success: true, message: 'Estado sincronizado' });
  }

  return res.status(200).json({
    success: true,
    data: {
      users: store.users,
      workspaces: store.workspaces,
      projects: store.projects,
      tasks: store.tasks,
    },
    users: store.users,
    workspaces: store.workspaces,
    projects: store.projects,
    tasks: store.tasks,
  });
}
