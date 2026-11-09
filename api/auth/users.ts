import { getServerStore } from '../_store.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getServerStore();
  let users = store.users || [];

  const { workspaceId, companyId, currentUserId } = req.query || {};

  if (workspaceId || companyId || currentUserId) {
    const workspaces = store.workspaces || [];
    const targetWs = workspaces.find((w: any) => w.id === workspaceId);
    const targetCompany = companyId || targetWs?.companyId;

    const reqUser = users.find((u: any) => u.id === currentUserId);
    const isMaster =
      reqUser?.systemRole === 'master' ||
      reqUser?.email?.toLowerCase().includes('alanvitordasilva');

    users = users.filter((u: any) => {
      if (!isMaster) {
        if (
          u.systemRole === 'master' ||
          u.isSuperAdmin ||
          u.email?.toLowerCase().includes('alanvitordasilva') ||
          u.username?.toLowerCase() === 'alan'
        ) {
          return false;
        }
      }
      if (targetWs) {
        const inMembers = Array.isArray(targetWs.members) && targetWs.members.some((m: any) => m.userId === u.id);
        const isOwner = targetWs.ownerId === u.id;
        const matchCompany =
          targetCompany && (u.companyId === targetCompany || u.tenantId === targetCompany);
        return inMembers || isOwner || matchCompany;
      }
      if (targetCompany) {
        return u.companyId === targetCompany || u.tenantId === targetCompany;
      }
      return true;
    });
  }

  return res.status(200).json({
    success: true,
    users,
  });
}
