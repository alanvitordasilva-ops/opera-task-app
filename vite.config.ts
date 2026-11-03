import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';

const DB_FILE = path.resolve(process.cwd(), '.operatask_db.json');

const INITIAL_SERVER_DATA = {
  users: [
    {
      id: 'user-master-alan',
      name: 'Alan Silva (Master)',
      username: 'alan',
      email: 'alanvitordasilva@gmail.com.br',
      avatarColor: '#173653',
      title: 'Super Administrador / Master',
      systemRole: 'master',
      isSuperAdmin: true,
      status: 'active',
      isActive: true,
      password: '273021',
      createdAt: '2026-01-01T00:00:00.000Z',
      bio: 'Conta Master com acesso total e irrestrito a todas as configurações, workspaces e dados do OperaTask.',
    },
  ],
  workspaces: [
    {
      id: 'ws-principal',
      name: 'Meu Workspace',
      slug: 'meu-workspace',
      description: 'Espaço de trabalho corporativo',
      logoColor: '#173653',
      ownerId: 'user-master-alan',
      members: [
        { userId: 'user-master-alan', role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z' },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  projects: [],
  tasks: [],
  tags: [
    { id: 'tag-frontend', name: 'Frontend', color: '#2563eb' },
    { id: 'tag-design', name: 'Design & UX', color: '#db2777' },
    { id: 'tag-backend', name: 'Backend & API', color: '#ea580c' },
    { id: 'tag-bug', name: 'Bug Crítico', color: '#dc2626' },
    { id: 'tag-feature', name: 'Nova Feature', color: '#059669' },
    { id: 'tag-devops', name: 'Infra / Cloud', color: '#7c3aed' },
  ],
  activities: [],
  notifications: [],
  fichas_tecnicas: [],
};

function readDb(): Record<string, any> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return {
          ...INITIAL_SERVER_DATA,
          ...parsed,
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_SERVER_DATA.users,
          workspaces: Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0 ? parsed.workspaces : INITIAL_SERVER_DATA.workspaces,
        };
      }
    }
  } catch (e) {
    console.error('[OperaTask Server] Erro ao carregar DB:', e);
  }
  return { ...INITIAL_SERVER_DATA };
}

function writeDb(data: Record<string, any>) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[OperaTask Server] Erro ao salvar DB:', e);
  }
}

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function operataskRealtimePlugin() {
  let wss: WebSocketServer | null = null;
  const sharedCache: Record<string, any> = readDb();
  writeDb(sharedCache);

  const broadcastWs = (data: any, excludeWs?: any) => {
    if (!wss) return;
    const raw = JSON.stringify(data);
    wss.clients.forEach((client: any) => {
      if (client !== excludeWs && client.readyState === 1 /* OPEN */) {
        try {
          client.send(raw);
        } catch {}
      }
    });
  };

  return {
    name: 'operatask-realtime-plugin',
    configureServer(server: any) {
      if (!server.httpServer) return;

      wss = new WebSocketServer({ noServer: true });

      server.httpServer.on('upgrade', (request: any, socket: any, head: any) => {
        try {
          const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
          if (url.pathname === '/ws' || url.pathname === '/api/realtime') {
            wss?.handleUpgrade(request, socket, head, (ws: any) => {
              wss?.emit('connection', ws, request);
            });
          }
        } catch {
          // Ignore other upgrades
        }
      });

      wss.on('connection', (ws: any) => {
        try {
          ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload: sharedCache }));
        } catch {}

        ws.on('message', (raw: any) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === 'SYNC_UPDATE' && data.entity) {
              sharedCache[data.entity] = data.payload;
              writeDb(sharedCache);
              broadcastWs(data, ws);
            } else if (data.type === 'PING') {
              ws.send(JSON.stringify({ type: 'PONG' }));
            }
          } catch (e) {
            console.error('Realtime WS error:', e);
          }
        });
      });

      // API: Estado Completo Compartilhado (Sync Cross-Device)
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/sync/state') {
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'GET') {
            res.end(JSON.stringify({ status: 'ok', data: sharedCache }));
            return;
          }
          if (req.method === 'POST') {
            const body = await parseJsonBody(req);
            if (body && typeof body === 'object') {
              Object.assign(sharedCache, body);
              writeDb(sharedCache);
              broadcastWs({ type: 'INITIAL_STATE', payload: sharedCache });
            }
            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            return;
          }
        }

        // API: Cadastro Direto de Usuário com Ativação Automática
        if (url === '/api/auth/register' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          const body = await parseJsonBody(req);

          const cleanName = (body.name || '').trim();
          const cleanUsername = (body.username || body.usernameOrEmail || '').trim().toLowerCase().split('@')[0];
          const cleanEmail = (body.email || (cleanUsername ? `${cleanUsername}@operatask.app` : '')).trim().toLowerCase();
          const cleanPassword = (body.password || '').trim();
          const chosenRole = body.role || 'production';
          const targetWorkspaceId = body.workspaceId || sharedCache.workspaces?.[0]?.id || 'ws-principal';

          if (!cleanName || !cleanUsername || !cleanPassword) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Nome, nome de usuário e senha são obrigatórios.' }));
            return;
          }

          if (!Array.isArray(sharedCache.users)) {
            sharedCache.users = [...INITIAL_SERVER_DATA.users];
          }

          const exists = sharedCache.users.some(
            (u: any) =>
              (u.username && u.username.toLowerCase() === cleanUsername) ||
              (u.email && u.email.toLowerCase() === cleanEmail) ||
              (u.email && u.email.toLowerCase().split('@')[0] === cleanUsername)
          );

          if (exists) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Já existe um usuário com este nome de usuário ou e-mail.' }));
            return;
          }

          const roleTitleMap: Record<string, string> = {
            owner: 'Dono do Workspace',
            admin: 'Administrador',
            production: 'Produção',
            member: 'Membro da Equipe',
            viewer: 'Visualizador',
          };

          const newUser = {
            id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail,
            password: cleanPassword,
            avatarColor: '#34B1AC',
            title: roleTitleMap[chosenRole] || 'Membro da Equipe',
            status: 'active',
            isActive: true,
            createdAt: new Date().toISOString(),
          };

          sharedCache.users.push(newUser);

          // Vincula imediatamente ao Workspace selecionado
          if (!Array.isArray(sharedCache.workspaces)) {
            sharedCache.workspaces = [...INITIAL_SERVER_DATA.workspaces];
          }

          let ws = sharedCache.workspaces.find((w: any) => w.id === targetWorkspaceId);
          if (!ws && sharedCache.workspaces.length > 0) {
            ws = sharedCache.workspaces[0];
          }

          if (ws) {
            if (!Array.isArray(ws.members)) ws.members = [];
            if (!ws.members.some((m: any) => m.userId === newUser.id)) {
              ws.members.push({
                userId: newUser.id,
                role: chosenRole,
                joinedAt: new Date().toISOString(),
              });
            }
          }

          writeDb(sharedCache);

          broadcastWs({ type: 'SYNC_UPDATE', entity: 'users', payload: sharedCache.users });
          broadcastWs({ type: 'SYNC_UPDATE', entity: 'workspaces', payload: sharedCache.workspaces });

          res.end(JSON.stringify({ success: true, user: newUser }));
          return;
        }

        // API: Validação de Login no Servidor
        if (url === '/api/auth/login' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          const body = await parseJsonBody(req);
          const cleanIdent = (body.identifier || body.username || body.email || '').trim().toLowerCase();
          const password = (body.password || '').trim();

          if (!cleanIdent || !password) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Informe suas credenciais.' }));
            return;
          }

          const isMaster =
            cleanIdent === 'alanvitordasilva@gmail.com.br' ||
            cleanIdent === 'alanvitordasilva@gmail.com' ||
            cleanIdent === 'alan';

          if (isMaster) {
            if (password !== '273021') {
              res.statusCode = 401;
              res.end(JSON.stringify({ success: false, error: 'Usuário ou senha inválidos.' }));
              return;
            }
            const masterUser = sharedCache.users?.find((u: any) => u.systemRole === 'master') || INITIAL_SERVER_DATA.users[0];
            res.end(JSON.stringify({ success: true, user: masterUser }));
            return;
          }

          const user = sharedCache.users?.find((u: any) => {
            const uUser = (u.username || '').toLowerCase();
            const uEmail = (u.email || '').toLowerCase();
            const uName = (u.name || '').toLowerCase();
            return (
              uUser === cleanIdent ||
              uEmail === cleanIdent ||
              uName === cleanIdent ||
              uEmail.split('@')[0] === cleanIdent ||
              (!cleanIdent.includes('@') && uEmail === `${cleanIdent}@operatask.app`)
            );
          });

          if (!user) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'Conta não encontrada. Verifique os dados ou solicite o cadastro ao administrador.' }));
            return;
          }

          if (user.password && user.password !== password) {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, error: 'Usuário ou senha inválidos.' }));
            return;
          }

          res.end(JSON.stringify({ success: true, user }));
          return;
        }

        // API: Lista de Usuários
        if (url === '/api/auth/users' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', users: sharedCache.users || [] }));
          return;
        }

        // API: Lista de Workspaces
        if (url === '/api/workspaces' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', workspaces: sharedCache.workspaces || [] }));
          return;
        }

        // API: Health Check
        if (url === '/api/realtime/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'ok',
              connections: wss ? wss.clients.size : 0,
              usersCount: sharedCache.users?.length || 0,
              workspacesCount: sharedCache.workspaces?.length || 0,
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      operataskRealtimePlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'OperaTask - Gestão de Projetos e Tarefas',
          short_name: 'OperaTask',
          description: 'Plataforma inteligente de gestão de projetos, tarefas em quadros e controle operacional.',
          theme_color: '#173653',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'pt-BR',
          categories: ['productivity', 'business', 'utilities'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallbackDenylist: [/^\/api/, /^\/ws/],
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
