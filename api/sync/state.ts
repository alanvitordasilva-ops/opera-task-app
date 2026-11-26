import { getServerStore, INITIAL_USERS, INITIAL_WORKSPACES } from '../_store.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getServerStore();

  if (req.method === 'POST') {
    const body = req.body || {};

    if (body.resetTestData === true) {
      const resetAt = body.resetAt || new Date().toISOString();
      store.users = Array.isArray(body.users) ? body.users : [...INITIAL_USERS];
      store.workspaces = Array.isArray(body.workspaces) ? body.workspaces : [...INITIAL_WORKSPACES];
      store.projects = Array.isArray(body.projects) ? body.projects : [];
      store.tasks = Array.isArray(body.tasks) ? body.tasks : [];
      if (Array.isArray(body.tags)) store.tags = body.tags;
      store.activities = Array.isArray(body.activities) ? body.activities : [];
      store.notifications = Array.isArray(body.notifications) ? body.notifications : [];
      store.fichas_tecnicas = Array.isArray(body.fichas_tecnicas) ? body.fichas_tecnicas : [];
      store.clients = Array.isArray(body.clients) ? body.clients : [];
      store.deletedTaskIds = [];
      store.deletedProjectIds = [];
      store.deletedWorkspaceIds = [];
      store.lastResetAt = resetAt;
      const version = store.bumpVersion();
      return res.status(200).json({ success: true, reset: true, lastResetAt: resetAt, version });
    }

    const action = String(body.action || '');
    const isAuthoritativeWsUpdate =
      Boolean(body.replaceAll) ||
      action === 'update_workspace' ||
      action === 'remove_member' ||
      action === 'sync_user_workspaces' ||
      action === 'reorder_workspaces' ||
      action === 'delete_workspace';

    if (Array.isArray(body.deletedWorkspaceIds) && body.deletedWorkspaceIds.length > 0) {
      const incomingDelWs = body.deletedWorkspaceIds.map((id: any) => String(id)).filter(Boolean);
      store.deletedWorkspaceIds = Array.from(new Set([...incomingDelWs, ...store.deletedWorkspaceIds])).slice(0, 500);
    }
    const deletedWsSet = new Set<string>(store.deletedWorkspaceIds);

    if (Array.isArray(body.users)) {
      if (body.replaceAll) {
        store.users = body.users;
      } else {
        const userMap = new Map<string, any>();
        (store.users || []).forEach((u: any) => u?.id && userMap.set(u.id, u));
        body.users.forEach((u: any) => {
          if (u?.id) userMap.set(u.id, { ...userMap.get(u.id), ...u, status: 'active', isActive: true });
        });
        store.users = Array.from(userMap.values());
      }
    }

    if (Array.isArray(body.workspaces)) {
      if (body.replaceAll) {
        store.workspaces = body.workspaces.filter((w: any) => w?.id && !deletedWsSet.has(w.id));
      } else {
        const wsMap = new Map<string, any>();
        (store.workspaces || []).forEach((w: any) => {
          if (w?.id && !deletedWsSet.has(w.id)) wsMap.set(w.id, w);
        });
        body.workspaces.forEach((w: any) => {
          if (!w?.id || deletedWsSet.has(w.id)) return;
          const prev = wsMap.get(w.id);
          if (prev) {
            if (isAuthoritativeWsUpdate && Array.isArray(w.members)) {
              wsMap.set(w.id, { ...prev, ...w, members: w.members });
            } else {
              const mMap = new Map<string, any>();
              (Array.isArray(prev.members) ? prev.members : []).forEach((m: any) => m?.userId && mMap.set(m.userId, m));
              (Array.isArray(w.members) ? w.members : []).forEach((m: any) => m?.userId && mMap.set(m.userId, m));
              wsMap.set(w.id, { ...prev, ...w, members: Array.from(mMap.values()) });
            }
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
    } else if (deletedWsSet.size > 0) {
      store.workspaces = (store.workspaces || []).filter((w: any) => w?.id && !deletedWsSet.has(w.id));
    }

    if (Array.isArray(body.deletedProjectIds) && body.deletedProjectIds.length > 0) {
      const incomingDelProj = body.deletedProjectIds.map((id: any) => String(id)).filter(Boolean);
      store.deletedProjectIds = Array.from(new Set([...incomingDelProj, ...store.deletedProjectIds])).slice(0, 2000);
    }
    const deletedProjSet = new Set<string>(store.deletedProjectIds);

    if (Array.isArray(body.projects)) {
      if (body.replaceAll) {
        store.projects = body.projects.filter(
          (p: any) => p?.id && !deletedProjSet.has(p.id) && !deletedWsSet.has(p.workspaceId)
        );
      } else {
        const projMap = new Map<string, any>();
        (store.projects || []).forEach((p: any) => {
          if (p?.id && !deletedProjSet.has(p.id) && !deletedWsSet.has(p.workspaceId)) projMap.set(p.id, p);
        });
        body.projects.forEach((p: any) => {
          if (p?.id && !deletedProjSet.has(p.id) && !deletedWsSet.has(p.workspaceId)) {
            projMap.set(p.id, { ...projMap.get(p.id), ...p });
          }
        });
        store.projects = Array.from(projMap.values());
      }
    } else if (deletedProjSet.size > 0 || deletedWsSet.size > 0) {
      store.projects = (store.projects || []).filter(
        (p: any) => p?.id && !deletedProjSet.has(p.id) && !deletedWsSet.has(p.workspaceId)
      );
    }

    if (Array.isArray(body.deletedTaskIds) && body.deletedTaskIds.length > 0) {
      const incomingDelTasks = body.deletedTaskIds.map((id: any) => String(id)).filter(Boolean);
      store.deletedTaskIds = Array.from(new Set([...incomingDelTasks, ...store.deletedTaskIds])).slice(0, 2000);
    }
    const deletedTaskSet = new Set<string>(store.deletedTaskIds);

    if (Array.isArray(body.tasks)) {
      if (body.replaceAll) {
        store.tasks = body.tasks.filter(
          (t: any) =>
            t?.id &&
            !deletedTaskSet.has(t.id) &&
            !deletedProjSet.has(t.projectId) &&
            !deletedWsSet.has(t.workspaceId)
        );
      } else {
        const getTs = (t: any) => {
          const ts = Date.parse(t?.updatedAt || t?.createdAt || '');
          return Number.isNaN(ts) ? 0 : ts;
        };
        const taskMap = new Map<string, any>();
        (store.tasks || []).forEach((t: any) => {
          if (
            t?.id &&
            !deletedTaskSet.has(t.id) &&
            !deletedProjSet.has(t.projectId) &&
            !deletedWsSet.has(t.workspaceId)
          ) {
            taskMap.set(t.id, t);
          }
        });
        body.tasks.forEach((t: any) => {
          if (
            !t?.id ||
            deletedTaskSet.has(t.id) ||
            deletedProjSet.has(t.projectId) ||
            deletedWsSet.has(t.workspaceId)
          ) {
            return;
          }
          const prev = taskMap.get(t.id);
          if (!prev || getTs(t) >= getTs(prev)) {
            taskMap.set(t.id, prev ? { ...prev, ...t } : t);
          }
        });
        store.tasks = Array.from(taskMap.values());
      }
    } else if (deletedTaskSet.size > 0 || deletedProjSet.size > 0 || deletedWsSet.size > 0) {
      store.tasks = (store.tasks || []).filter(
        (t: any) =>
          t?.id &&
          !deletedTaskSet.has(t.id) &&
          !deletedProjSet.has(t.projectId) &&
          !deletedWsSet.has(t.workspaceId)
      );
    }

    if (Array.isArray(body.tags)) store.tags = body.tags;
    if (Array.isArray(body.activities)) store.activities = body.activities;
    if (Array.isArray(body.notifications)) store.notifications = body.notifications;
    if (Array.isArray(body.fichas_tecnicas)) store.fichas_tecnicas = body.fichas_tecnicas;
    if (Array.isArray(body.clients)) store.clients = body.clients;

    const version = store.bumpVersion();
    return res.status(200).json({ success: true, message: 'Estado sincronizado', version });
  }

  // GET /api/sync/state?since=<version>
  const sinceParam = req.query?.since ? Number(req.query.since) : 0;
  if (sinceParam && sinceParam === store.version) {
    return res.status(200).json({
      success: true,
      status: 'ok',
      unchanged: true,
      version: store.version,
    });
  }

  return res.status(200).json({
    success: true,
    status: 'ok',
    version: store.version,
    data: {
      users: store.users,
      workspaces: store.workspaces,
      projects: store.projects,
      tasks: store.tasks,
      tags: store.tags,
      activities: store.activities,
      notifications: store.notifications,
      fichas_tecnicas: store.fichas_tecnicas,
      clients: store.clients,
      deletedTaskIds: store.deletedTaskIds,
      deletedProjectIds: store.deletedProjectIds,
      deletedWorkspaceIds: store.deletedWorkspaceIds,
      lastResetAt: store.lastResetAt,
      version: store.version,
    },
    users: store.users,
    workspaces: store.workspaces,
    projects: store.projects,
    tasks: store.tasks,
    tags: store.tags,
    activities: store.activities,
    notifications: store.notifications,
    fichas_tecnicas: store.fichas_tecnicas,
    clients: store.clients,
    deletedTaskIds: store.deletedTaskIds,
    deletedProjectIds: store.deletedProjectIds,
    deletedWorkspaceIds: store.deletedWorkspaceIds,
    lastResetAt: store.lastResetAt,
  });
}
