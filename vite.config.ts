import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { WebSocketServer } from 'ws';

function operataskRealtimePlugin() {
  let wss: WebSocketServer | null = null;
  const sharedCache: Record<string, any> = {};

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
        if (Object.keys(sharedCache).length > 0) {
          try {
            ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload: sharedCache }));
          } catch {}
        }

        ws.on('message', (raw: any) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === 'SYNC_UPDATE' && data.entity) {
              sharedCache[data.entity] = data.payload;
              wss?.clients.forEach((client: any) => {
                if (client !== ws && client.readyState === 1 /* OPEN */) {
                  client.send(JSON.stringify(data));
                }
              });
            } else if (data.type === 'PING') {
              ws.send(JSON.stringify({ type: 'PONG' }));
            }
          } catch (e) {
            console.error('Realtime WS error:', e);
          }
        });
      });

      server.middlewares.use('/api/realtime/health', (_req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            status: 'ok',
            connections: wss ? wss.clients.size : 0,
            timestamp: new Date().toISOString(),
          })
        );
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
        '@': path.resolve(__dirname, '.'),
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
