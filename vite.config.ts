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
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
    }
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        console.error('[OperaTask] Erro ao parsear JSON no body:', err, raw);
        resolve({});
      }
    });
    req.on('error', (err: any) => {
      console.error('[OperaTask] Erro na stream do body:', err);
      resolve({});
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

      // API: Middleware Central de Autenticação e Sincronização Cross-Device
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];

        // 1. Estado Completo Compartilhado (Sync Cross-Device Web e Mobile)
        if (url === '/api/sync/state') {
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'GET') {
            const latestDb = readDb();
            Object.assign(sharedCache, latestDb);
            res.end(
              JSON.stringify({
                status: 'ok',
                data: sharedCache,
                users: sharedCache.users || [],
                workspaces: sharedCache.workspaces || [],
                projects: sharedCache.projects || [],
                tasks: sharedCache.tasks || [],
                tags: sharedCache.tags || [],
                activities: sharedCache.activities || [],
              })
            );
            return;
          }
          if (req.method === 'POST') {
            const body = await parseJsonBody(req);
            if (body && typeof body === 'object') {
              if (Array.isArray(body.users)) {
                const userMap = new Map();
                (sharedCache.users || []).forEach((u: any) => userMap.set(u.id, u));
                body.users.forEach((u: any) => {
                  userMap.set(u.id, { ...userMap.get(u.id), ...u, status: 'active', isActive: true });
                });
                sharedCache.users = Array.from(userMap.values());
              }
              if (Array.isArray(body.workspaces)) sharedCache.workspaces = body.workspaces;
              if (Array.isArray(body.projects)) sharedCache.projects = body.projects;
              if (Array.isArray(body.tasks)) sharedCache.tasks = body.tasks;
              if (Array.isArray(body.tags)) sharedCache.tags = body.tags;
              if (Array.isArray(body.activities)) sharedCache.activities = body.activities;
              if (Array.isArray(body.fichas_tecnicas)) sharedCache.fichas_tecnicas = body.fichas_tecnicas;
              if (Array.isArray(body.notifications)) sharedCache.notifications = body.notifications;

              writeDb(sharedCache);
              broadcastWs({ type: 'INITIAL_STATE', payload: sharedCache });
            }
            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            return;
          }
        }

        // 2. API: Cadastro Imediato e Persistente de Usuário com Ativação Automática
        if (url === '/api/auth/register' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          const body = await parseJsonBody(req);

          const cleanName = (body.name || '').trim();
          const rawUsername = (body.username || body.usernameOrEmail || '').trim().toLowerCase();
          const cleanUsername = rawUsername.replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').replace(/^@/, '');
          const cleanEmail = (body.email || (cleanUsername ? `${cleanUsername}@operatask.app` : '')).trim().toLowerCase();
          const cleanPassword = (body.password || '').trim();
          const chosenRole = body.role || 'production';

          const rawWsIds: string[] = Array.isArray(body.workspaceIds) && body.workspaceIds.length > 0
            ? body.workspaceIds
            : body.workspaceId
            ? [body.workspaceId]
            : [sharedCache.workspaces?.[0]?.id || 'ws-principal'];
          const targetWorkspaceIds = rawWsIds.map((id: any) => String(id).trim()).filter(Boolean);

          if (!cleanName || !cleanUsername || !cleanPassword) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Nome, nome de usuário e senha são obrigatórios.' }));
            return;
          }

          if (targetWorkspaceIds.length === 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Pelo menos um Workspace deve ser selecionado.' }));
            return;
          }

          // Atualiza dados locais da base
          const freshDb = readDb();
          sharedCache.users = freshDb.users || sharedCache.users || [...INITIAL_SERVER_DATA.users];
          sharedCache.workspaces = freshDb.workspaces || sharedCache.workspaces || [...INITIAL_SERVER_DATA.workspaces];

          const roleTitleMap: Record<string, string> = {
            master: 'Super Administrador / Master',
            dono: 'Dono do Workspace',
            owner: 'Dono do Workspace',
            administrador: 'Administrador',
            admin: 'Administrador',
            producao: 'Produção',
            production: 'Produção',
            membro: 'Membro da Equipe',
            member: 'Membro da Equipe',
            visualizador: 'Visualizador',
            viewer: 'Visualizador',
          };

          // Verifica se o usuário já existe
          const existingIndex = sharedCache.users.findIndex(
            (u: any) =>
              (body.id && u.id === body.id) ||
              (u.username && u.username.toLowerCase() === cleanUsername) ||
              (u.email && u.email.toLowerCase() === cleanEmail)
          );

          let savedUser: any = null;

          if (existingIndex !== -1) {
            // Atualiza usuário existente mantendo status ativo
            sharedCache.users[existingIndex] = {
              ...sharedCache.users[existingIndex],
              name: cleanName,
              username: cleanUsername,
              email: cleanEmail,
              password: cleanPassword,
              title: roleTitleMap[chosenRole] || sharedCache.users[existingIndex].title || 'Membro da Equipe',
              tipo: chosenRole,
              status: 'active',
              isActive: true,
              avatarColor: body.avatarColor || sharedCache.users[existingIndex].avatarColor || '#34B1AC',
            };
            savedUser = sharedCache.users[existingIndex];
          } else {
            // Cria novo usuário já ativo
            savedUser = {
              id: body.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: cleanName,
              username: cleanUsername,
              email: cleanEmail,
              password: cleanPassword,
              avatarColor: body.avatarColor || '#34B1AC',
              title: roleTitleMap[chosenRole] || 'Membro da Equipe',
              tipo: chosenRole,
              status: 'active',
              isActive: true,
              createdAt: body.createdAt || new Date().toISOString(),
            };
            sharedCache.users.push(savedUser);
          }

          // Vincula o usuário a todos os Workspaces selecionados
          sharedCache.workspaces.forEach((ws: any) => {
            if (!Array.isArray(ws.members)) ws.members = [];
            const isSelected = targetWorkspaceIds.includes(ws.id);
            const memberIdx = ws.members.findIndex((m: any) => m.userId === savedUser.id);

            if (isSelected) {
              if (memberIdx !== -1) {
                ws.members[memberIdx].role = chosenRole;
              } else {
                ws.members.push({
                  userId: savedUser.id,
                  role: chosenRole,
                  joinedAt: new Date().toISOString(),
                });
              }
            } else if (memberIdx !== -1 && !body.keepExistingWorkspaces) {
              // Se não foi selecionado e não é update parcial, remove do workspace não selecionado
              ws.members.splice(memberIdx, 1);
            }
          });

          // Grava imediatamente no arquivo .operatask_db.json
          writeDb(sharedCache);

          // Notifica WebSockets
          broadcastWs({ type: 'SYNC_UPDATE', entity: 'users', payload: sharedCache.users });
          broadcastWs({ type: 'SYNC_UPDATE', entity: 'workspaces', payload: sharedCache.workspaces });

          console.log(`[OperaTask Server] Usuário salvo com sucesso: ${savedUser.name} (@${savedUser.username}) em ${targetWorkspaceIds.length} workspace(s):`, targetWorkspaceIds);

          res.end(
            JSON.stringify({
              success: true,
              user: savedUser,
              users: sharedCache.users,
              workspaces: sharedCache.workspaces,
            })
          );
          return;
        }

        // 3. API: Autenticação Segura, Normalizada e Universal (Busca por Nome de Usuário ou E-mail)
        if (url === '/api/auth/login' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          const body = await parseJsonBody(req);
          const rawIdent = String(body.identifier || body.username || body.email || '').trim();
          const password = String(body.password || '').trim();

          const normInput = rawIdent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const normInputNoAt = normInput.replace(/^@/, '');
          const normInputSlug = normInputNoAt.replace(/[^a-z0-9]/g, '');

          console.log('[OperaTask Auth Server] Tentativa de login recebida:', {
            rawIdent,
            normInputNoAt,
            hasPassword: Boolean(password),
          });

          if (!rawIdent || !password) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Informe seu nome de usuário ou e-mail e sua senha.' }));
            return;
          }

          // Sempre recarrega do arquivo de banco para garantir leitura de cadastros recentes
          const latestDb = readDb();
          sharedCache.users = latestDb.users || sharedCache.users || [];
          sharedCache.workspaces = latestDb.workspaces || sharedCache.workspaces || [];

          // Validação Conta Master
          const isMaster =
            normInputNoAt === 'alanvitordasilva@gmail.com.br' ||
            normInputNoAt === 'alanvitordasilva@gmail.com' ||
            normInputNoAt === 'alan' ||
            normInput === 'alan';

          if (isMaster) {
            if (password !== '273021') {
              console.warn('[OperaTask Auth Server] Senha incorreta para conta master alan.');
              res.statusCode = 401;
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'Usuário ou senha inválidos.',
                  debug: 'Senha incorreta para a conta master.',
                })
              );
              return;
            }
            const masterUser = sharedCache.users?.find((u: any) => u.systemRole === 'master') || INITIAL_SERVER_DATA.users[0];
            const activeMaster = { ...masterUser, status: 'active', isActive: true };
            console.log('[OperaTask Auth Server] Login da Conta Master efetuado com sucesso.');
            res.end(
              JSON.stringify({
                success: true,
                user: activeMaster,
                allUsers: sharedCache.users,
                workspaces: sharedCache.workspaces,
                projects: sharedCache.projects || [],
                tasks: sharedCache.tasks || [],
                tags: sharedCache.tags || [],
                activities: sharedCache.activities || [],
              })
            );
            return;
          }

          // Busca flexível, tolerante a acentos, pontuações, arroba e caixa alta/baixa
          const user = sharedCache.users?.find((u: any) => {
            const uUser = String(u.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const uUserNoAt = uUser.replace(/^@/, '');
            const uUserSlug = uUserNoAt.replace(/[^a-z0-9]/g, '');

            const uEmail = String(u.email || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const uEmailPrefix = uEmail.split('@')[0] || '';
            const uEmailSlug = uEmailPrefix.replace(/[^a-z0-9]/g, '');

            const uName = String(u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const firstName = uName.split(' ')[0] || '';

            return (
              (uUser && (uUser === normInput || uUserNoAt === normInputNoAt || uUserSlug === normInputSlug)) ||
              (uEmail && (uEmail === normInput || uEmail === normInputNoAt)) ||
              (uEmailPrefix && (uEmailPrefix === normInputNoAt || uEmailSlug === normInputSlug)) ||
              (uName && (uName === normInput || firstName === normInputNoAt)) ||
              (!normInput.includes('@') && uEmail === `${normInputNoAt}@operatask.app`)
            );
          });

          if (!user) {
            console.warn('[OperaTask Auth Server] Usuário NÃO localizado:', {
              rawIdent,
              normInputNoAt,
              totalUsers: sharedCache.users?.length,
              availableUsers: sharedCache.users?.map((u: any) => `@${u.username} (${u.email})`),
            });

            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: 'Conta não encontrada. Verifique os dados ou solicite o cadastro ao administrador.',
                debug: `Usuário '${rawIdent}' não localizado na base (${sharedCache.users?.length || 0} usuários registrados).`,
              })
            );
            return;
          }

          if (user.password && String(user.password).trim() !== password) {
            console.warn('[OperaTask Auth Server] Senha incorreta para o usuário:', user.username || user.email);
            res.statusCode = 401;
            res.end(
              JSON.stringify({
                success: false,
                error: 'Usuário ou senha inválidos.',
                debug: 'Senha informada não confere com a cadastrada.',
              })
            );
            return;
          }

          console.log('[OperaTask Auth Server] Login efetuado com sucesso:', {
            id: user.id,
            name: user.name,
            username: user.username,
          });

          // Garante retorno ativo
          const activeUser = { ...user, status: 'active', isActive: true };
          res.end(
            JSON.stringify({
              success: true,
              user: activeUser,
              allUsers: sharedCache.users,
              workspaces: sharedCache.workspaces,
              projects: sharedCache.projects || [],
              tasks: sharedCache.tasks || [],
              tags: sharedCache.tags || [],
              activities: sharedCache.activities || [],
            })
          );
          return;
        }

        // 4. API: Atualização Centralizada de Usuário (Senha, Cargo, Permissões)
        if (url === '/api/users/update' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          const body = await parseJsonBody(req);
          if (!body?.id) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'ID do usuário é obrigatório.' }));
            return;
          }

          const freshDb = readDb();
          sharedCache.users = freshDb.users || sharedCache.users || [];
          const idx = sharedCache.users.findIndex((u: any) => u.id === body.id);
          if (idx !== -1) {
            sharedCache.users[idx] = {
              ...sharedCache.users[idx],
              ...body,
              status: 'active',
              isActive: true,
            };
            writeDb(sharedCache);
            broadcastWs({ type: 'SYNC_UPDATE', entity: 'users', payload: sharedCache.users });
            res.end(JSON.stringify({ success: true, user: sharedCache.users[idx], users: sharedCache.users }));
            return;
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'Usuário não encontrado.' }));
            return;
          }
        }

        // 5. API: Exclusão Centralizada de Usuário
        if (url === '/api/users/delete' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          const body = await parseJsonBody(req);
          if (!body?.id) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'ID do usuário é obrigatório.' }));
            return;
          }

          const freshDb = readDb();
          sharedCache.users = (freshDb.users || sharedCache.users || []).filter((u: any) => u.id !== body.id);
          // Remove também dos workspaces
          if (Array.isArray(sharedCache.workspaces)) {
            sharedCache.workspaces.forEach((w: any) => {
              if (Array.isArray(w.members)) {
                w.members = w.members.filter((m: any) => m.userId !== body.id);
              }
            });
          }
          writeDb(sharedCache);
          broadcastWs({ type: 'SYNC_UPDATE', entity: 'users', payload: sharedCache.users });
          broadcastWs({ type: 'SYNC_UPDATE', entity: 'workspaces', payload: sharedCache.workspaces });
          res.end(JSON.stringify({ success: true, users: sharedCache.users, workspaces: sharedCache.workspaces }));
          return;
        }

        // 6. API: Configuração Pública (URL Oficial de Produção)
        if (url === '/api/config/public' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              productionUrl: 'https://ais-pre-v3pyk2r5zyjj6fe7ngn3pp-898367602402.us-east1.run.app',
              appUrl: process.env.APP_URL || 'https://ais-pre-v3pyk2r5zyjj6fe7ngn3pp-898367602402.us-east1.run.app',
            })
          );
          return;
        }

        // 7. API: Lista de Usuários
        if (url === '/api/auth/users' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          const latestDb = readDb();
          res.end(JSON.stringify({ status: 'ok', users: latestDb.users || sharedCache.users || [] }));
          return;
        }

        // 8. API: Lista de Workspaces
        if (url === '/api/workspaces' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          const latestDb = readDb();
          res.end(JSON.stringify({ status: 'ok', workspaces: latestDb.workspaces || sharedCache.workspaces || [] }));
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
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
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
