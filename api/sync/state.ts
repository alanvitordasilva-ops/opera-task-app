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
    if (Array.isArray(body.users)) {
      const userMap = new Map<string, any>();
      (store.users || []).forEach((u: any) => u?.id && userMap.set(u.id, u));
      body.users.forEach((u: any) => {
        if (u?.id) userMap.set(u.id, { ...userMap.get(u.id), ...u, status: 'active', isActive: true });
      });
      store.users = Array.from(userMap.values());
    }
    if (Array.isArray(body.workspaces)) {
      if (body.replaceAll) {
        store.workspaces = body.workspaces;
      } else {
        const wsMap = new Map<string, any>();
        (store.workspaces || []).forEach((w: any) => w?.id && wsMap.set(w.id, w));
        body.workspaces.forEach((w: any) => {
          if (!w?.id) return;
          const prev = wsMap.get(w.id);
          if (prev) {
            const mMap = new Map<string, any>();
            (Array.isArray(prev.members) ? prev.members : []).forEach((m: any) => m?.userId && mMap.set(m.userId, m));
            (Array.isArray(w.members) ? w.members : []).forEach((m: any) => m?.userId && mMap.set(m.userId, m));
            wsMap.set(w.id, { ...prev, ...w, members: Array.from(mMap.values()) });
          } else {
            wsMap.set(w.id, w);
          }
        });
        const mergedWs = Array.from(wsMap.values());
        const hasOrder = mergedWs.some((w: any) => typeof w?.orderIndex === 'number');
        store.workspaces = hasOrder
          ? mergedWs
              .map((w: any, idx: number) => ({ w, idx }))
              .sort((a: any, b: any) => {
                const ao = typeof a.w?.orderIndex === 'number' ? a.w.orderIndex : Number.MAX_SAFE_INTEGER;
                const bo = typeof b.w?.orderIndex === 'number' ? b.w.orderIndex : Number.MAX_SAFE_INTEGER;
                return ao !== bo ? ao - bo : a.idx - b.idx;
              })
              .map((e: any) => e.w)
          : mergedWs;
      }
    }
    if (Array.isArray(body.projects)) {
      if (body.replaceAll) {
        store.projects = body.projects;
      } else {
        const projMap = new Map<string, any>();
        (store.projects || []).forEach((p: any) => p?.id && projMap.set(p.id, p));
        body.projects.forEach((p: any) => {
          if (p?.id) projMap.set(p.id, { ...projMap.get(p.id), ...p });
        });
        store.projects = Array.from(projMap.values());
      }
    }
    if (Array.isArray(body.tasks)) {
      const deletedSet = new Set<string>(
        Array.isArray(body.deletedTaskIds) ? body.deletedTaskIds.map((id: any) => String(id)) : []
      );
      if (body.replaceAll) {
        store.tasks = body.tasks.filter((t: any) => t?.id && !deletedSet.has(t.id));
      } else {
        const getTs = (t: any) => {
          const ts = Date.parse(t?.updatedAt || t?.createdAt || '');
          return Number.isNaN(ts) ? 0 : ts;
        };
        const taskMap = new Map<string, any>();
        (store.tasks || []).forEach((t: any) => {
          if (t?.id && !deletedSet.has(t.id)) taskMap.set(t.id, t);
        });
        body.tasks.forEach((t: any) => {
          if (!t?.id || deletedSet.has(t.id)) return;
          const prev = taskMap.get(t.id);
          if (!prev || getTs(t) >= getTs(prev)) {
            taskMap.set(t.id, prev ? { ...prev, ...t } : t);
          }
        });
        store.tasks = Array.from(taskMap.values());
      }
    } else if (Array.isArray(body.deletedTaskIds) && body.deletedTaskIds.length > 0) {
      const deletedSet = new Set<string>(body.deletedTaskIds.map((id: any) => String(id)));
      store.tasks = (store.tasks || []).filter((t: any) => t?.id && !deletedSet.has(t.id));
    }
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
