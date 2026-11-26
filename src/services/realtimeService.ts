/**
 * OperaTask Realtime Synchronization Service
 *
 * Provides unified, multi-tier real-time sync across Web, Desktop, Android, and iOS:
 * 1. Native WebSocket on /ws with active Ping/Pong zombie-socket detection & reconnect queue
 * 2. BroadcastChannel + Storage events for 0ms cross-tab synchronization
 * 3. Supabase Realtime (Broadcast + Postgres Changes across all tables) when configured
 * 4. Adaptive versioned HTTP reconciliation (?since=<version>, cache: no-store) as a zero-drift
 *    fallback for mobile networks, iOS Safari backgrounding, proxies, and serverless deploys
 */

import { SupabaseService } from './supabaseService.ts';
import { StorageService, isServerApiAvailable, setServerApiAvailable } from './storage.ts';
import {
  mergeTaskLists,
  getDeletedTaskIds,
  markTaskDeleted,
  getDeletedProjectIds,
  markProjectDeleted,
  getDeletedWorkspaceIds,
  markWorkspaceDeleted,
  mergeProjectColumns,
} from '../utils/helpers.ts';

export type SyncEntity =
  | 'tasks'
  | 'projects'
  | 'workspaces'
  | 'fichas_tecnicas'
  | 'users'
  | 'tags'
  | 'activities'
  | 'notifications'
  | 'clients'
  | 'subscription_plans';

export interface SyncMessage<T = any> {
  type: 'SYNC_UPDATE' | 'INITIAL_STATE' | 'PING' | 'PONG';
  entity?: SyncEntity;
  payload?: T;
  version?: number;
  clientId: string;
  timestamp: string;
  actionMeta?: {
    action: string;
    targetId?: string;
    userName?: string;
    lastResetAt?: string | null;
  };
}

type EntityListener<T = any> = (data: T, meta?: SyncMessage['actionMeta']) => void;
type ConnectionStatusListener = (status: 'connected' | 'reconnecting' | 'offline') => void;

const ENTITY_TO_STORAGE_KEY: Record<SyncEntity, string> = {
  users: 'operatask_clean_v1_users',
  workspaces: 'operatask_clean_v1_workspaces',
  projects: 'operatask_clean_v1_projects',
  tasks: 'operatask_clean_v1_tasks',
  fichas_tecnicas: 'operatask_clean_v1_fichas_tecnicas',
  tags: 'operatask_clean_v1_tags',
  activities: 'operatask_clean_v1_activities',
  notifications: 'operatask_clean_v1_notifications',
  clients: 'operatask_clean_v1_clients',
  subscription_plans: 'operatask_clean_v1_subscription_plans',
};

const STORAGE_KEY_TO_ENTITY: Record<string, SyncEntity> = Object.entries(ENTITY_TO_STORAGE_KEY).reduce(
  (acc, [entity, key]) => {
    acc[key] = entity as SyncEntity;
    return acc;
  },
  {} as Record<string, SyncEntity>
);

class RealtimeServiceImpl {
  private clientId: string;
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<SyncEntity, Set<EntityListener>> = new Map();
  private statusListeners: Set<ConnectionStatusListener> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private pongTimeoutTimer: any = null;
  private pollTimer: any = null;
  private pollTick = 0;
  private lastPongAt = 0;
  private lastServerVersion = 0;
  private hasConnectedWsOnce = false;
  private isFetchingServerState = false;
  private isResyncing = false;
  private lastResyncAt = 0;
  private connectionStatus: 'connected' | 'reconnecting' | 'offline' = 'offline';
  private supabaseChannel: any = null;
  private isSupabaseSubscribed = false;
  private supabaseReconnectTimer: any = null;
  private pendingWsBroadcasts: Map<SyncEntity, SyncMessage> = new Map();
  private isInitialized = false;

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getLastServerVersion(): number {
    return this.lastServerVersion;
  }

  public updateKnownServerVersion(version?: number) {
    if (typeof version === 'number' && version > this.lastServerVersion) {
      this.lastServerVersion = version;
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Canal local BroadcastChannel (cross-tab / cross-window instantâneo)
    this.setupBroadcastChannel();

    // 2. Conexão WebSocket com o servidor OperaTask
    this.connectWebSocket();

    // 3. Fallback de evento de storage (outras abas no mesmo navegador)
    this.setupStorageListener();

    // 4. Canal Supabase Realtime (Android, iOS, Web e Desktop) se configurado
    this.setupSupabaseRealtime();

    // 5. Carregar estado compartilhado autoritativo imediatamente
    this.fetchServerState(true);

    // 6. Polling adaptativo leve (?since=<version>) garantindo 100% de convergência em Android, iOS, Web e Desktop
    this.startAdaptivePolling();

    // 7. Resincronização automática ao focar, voltar do background (Android/iOS), bfcache (iOS Safari) ou reconectar rede
    window.addEventListener('focus', () => {
      this.resyncOnActive();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.resyncOnActive();
      }
    });
    window.addEventListener('pageshow', () => {
      this.resyncOnActive();
    });
    window.addEventListener('online', () => {
      setServerApiAvailable(true);
      this.resyncOnActive(true);
    });
    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });
  }

  private startAdaptivePolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTick = 0;

    this.pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      this.pollTick += 1;
      const wsOpen = Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);

      // Quando WebSocket não está aberto (ex: rede móvel instável, proxy ou serverless): verifica a cada 3s
      // Quando WebSocket está aberto: faz reconciliação leve a cada 12s (4 ticks) usando ?since=<version>
      if (!wsOpen) {
        if (isServerApiAvailable()) {
          this.fetchServerState(false);
        }
        // A cada 9s (3 ticks) sem WS, reconcilia também do Supabase se configurado
        if (this.pollTick % 3 === 0 && SupabaseService.isConfigured()) {
          this.pullSupabaseEntities();
        }
      } else if (this.pollTick % 4 === 0) {
        if (isServerApiAvailable()) {
          this.fetchServerState(false);
        }
      }
    }, 3000);
  }

  private async pullSupabaseEntities() {
    if (!SupabaseService.isConfigured()) return;
    try {
      const wsRes = await StorageService.fetchWorkspacesCloud();
      if (wsRes.success && Array.isArray(wsRes.workspaces) && wsRes.workspaces.length > 0) {
        this.notifyEntityListeners('workspaces', wsRes.workspaces, { action: 'cloud_resync' });
      }

      const curWsId = StorageService.getCurrentWorkspace()?.id;
      if (curWsId) {
        const [projRes, taskRes] = await Promise.all([
          StorageService.fetchProjectsCloud(curWsId),
          StorageService.fetchTasksCloud(curWsId),
        ]);
        if (projRes.success && Array.isArray(projRes.projects)) {
          this.notifyEntityListeners('projects', projRes.projects, { action: 'cloud_resync' });
        }
        if (taskRes.success && Array.isArray(taskRes.tasks)) {
          this.notifyEntityListeners('tasks', taskRes.tasks, { action: 'cloud_resync' });
        }
      }

      const [clientsRes, usersRes] = await Promise.all([
        StorageService.fetchClientsCloud(),
        StorageService.fetchRegisteredUsersCloud(),
      ]);
      if (clientsRes.success && Array.isArray(clientsRes.clients)) {
        this.notifyEntityListeners('clients', clientsRes.clients, { action: 'cloud_resync' });
      }
      if (Array.isArray(usersRes) && usersRes.length > 0) {
        this.notifyEntityListeners('users', usersRes, { action: 'cloud_resync' });
      }
    } catch (e) {
      console.warn('[RealtimeService] Aviso ao sincronizar entidades da nuvem:', e);
    }
  }

  public async resyncOnActive(force = false) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const now = Date.now();
    if (!force && (this.isResyncing || now - this.lastResyncAt < 1200)) return;
    this.isResyncing = true;
    this.lastResyncAt = now;

    try {
      // 1. Garante que WebSocket não ficou "zumbi" após suspensão em Android / iOS
      const wsStale =
        !this.ws ||
        this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CLOSING ||
        (this.ws.readyState === WebSocket.OPEN && this.lastPongAt > 0 && now - this.lastPongAt > 25000);

      if (wsStale) {
        this.forceReconnectWebSocket();
      } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch {
          this.forceReconnectWebSocket();
        }
      }

      // 2. Reconecta canal Supabase Realtime caso tenha caído em segundo plano
      if (SupabaseService.isConfigured() && !this.isSupabaseSubscribed) {
        this.setupSupabaseRealtime();
      }

      // 3. Re-sincroniza estado completo do servidor HTTP (cache: no-store) e Supabase
      await Promise.all([
        this.fetchServerState(true),
        SupabaseService.isConfigured() ? this.pullSupabaseEntities() : Promise.resolve(),
      ]);
    } catch (e) {
      console.warn('Erro ao re-sincronizar no foco:', e);
    } finally {
      this.isResyncing = false;
    }
  }

  private setStatus(status: 'connected' | 'reconnecting' | 'offline') {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach((fn) => {
        try {
          fn(status);
        } catch (e) {
          console.warn('Status listener error:', e);
        }
      });
    }
  }

  public getStatus(): 'connected' | 'reconnecting' | 'offline' {
    return this.connectionStatus;
  }

  public subscribeStatus(callback: ConnectionStatusListener): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  // ==========================================
  // TIER 1: BroadcastChannel Local
  // ==========================================
  private setupBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('operatask_realtime_bus');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data, 'broadcast');
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel não suportado neste navegador:', e);
    }
  }

  // ==========================================
  // TIER 2: WebSocket Server (/ws)
  // ==========================================
  private forceReconnectWebSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        const wasReconnect = this.hasConnectedWsOnce;
        this.hasConnectedWsOnce = true;
        this.reconnectAttempts = 0;
        this.lastPongAt = Date.now();
        this.setStatus('connected');
        this.startHeartbeat();

        // Envia atualizações pendentes acumuladas enquanto estava desconectado
        if (this.pendingWsBroadcasts.size > 0) {
          this.pendingWsBroadcasts.forEach((queuedMsg) => {
            try {
              socket.send(JSON.stringify(queuedMsg));
            } catch {}
          });
          this.pendingWsBroadcasts.clear();
        }

        // Ao reconectar após queda ou retorno do background, reconcilia estado completo
        if (wasReconnect) {
          this.fetchServerState(true);
        }
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        this.lastPongAt = Date.now();
        if (this.pongTimeoutTimer) {
          clearTimeout(this.pongTimeoutTimer);
          this.pongTimeoutTimer = null;
        }
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'PONG') {
            if (typeof msg.version === 'number' && msg.version > this.lastServerVersion) {
              this.fetchServerState(true);
            }
            return;
          }
          this.handleIncomingMessage(msg, 'websocket');
        } catch (e) {
          console.warn('Erro ao decodificar mensagem WebSocket:', e);
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.ws = null;
        this.stopHeartbeat();
        this.setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'reconnecting');
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        try {
          socket.close();
        } catch {}
      };
    } catch {
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
          if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);
          this.pongTimeoutTimer = setTimeout(() => {
            // Sem resposta do servidor em 8s (socket mobile zumbi): reconecta imediatamente
            this.forceReconnectWebSocket();
          }, 8000);
        } catch {
          this.forceReconnectWebSocket();
        }
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 12000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }

  // ==========================================
  // TIER 3: Supabase Realtime (Multiplataforma: Android, iOS, Computador)
  // ==========================================
  public setupSupabaseRealtime() {
    try {
      const client = SupabaseService.getClient();
      if (!client) return;

      if (this.supabaseReconnectTimer) {
        clearTimeout(this.supabaseReconnectTimer);
        this.supabaseReconnectTimer = null;
      }

      if (this.supabaseChannel) {
        try {
          client.removeChannel(this.supabaseChannel);
        } catch {}
        this.supabaseChannel = null;
        this.isSupabaseSubscribed = false;
      }

      const channel = client
        .channel('operatask-live-sync', {
          config: {
            broadcast: { ack: false, self: false },
          },
        })
        .on('broadcast', { event: 'entity_sync' }, (eventData: any) => {
          if (eventData && eventData.payload) {
            this.handleIncomingMessage(eventData.payload, 'broadcast');
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload: any) => {
          this.handleSupabaseDbChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
          this.handleSupabaseDbChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, async (payload: any) => {
          if (payload?.eventType === 'DELETE' && payload?.old?.id) {
            markWorkspaceDeleted(String(payload.old.id));
          }
          if (SupabaseService.isConfigured()) {
            const cloudRes = await StorageService.fetchWorkspacesCloud();
            if (cloudRes.success && Array.isArray(cloudRes.workspaces) && cloudRes.workspaces.length > 0) {
              this.notifyEntityListeners('workspaces', cloudRes.workspaces, {
                action: payload?.eventType === 'DELETE' ? 'delete_workspace' : 'update_workspace',
                targetId: payload?.old?.id || payload?.new?.id,
              });
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, async () => {
          if (SupabaseService.isConfigured()) {
            const cloudRes = await StorageService.fetchWorkspacesCloud();
            if (cloudRes.success && Array.isArray(cloudRes.workspaces) && cloudRes.workspaces.length > 0) {
              this.notifyEntityListeners('workspaces', cloudRes.workspaces, {
                action: 'sync_user_workspaces',
              });
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, async () => {
          if (SupabaseService.isConfigured()) {
            const cloudRes = await StorageService.fetchClientsCloud();
            if (cloudRes.success && Array.isArray(cloudRes.clients)) {
              this.notifyEntityListeners('clients', cloudRes.clients, {
                action: 'supabase_tenants_changed',
              });
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, async (payload: any) => {
          if (payload?.eventType === 'DELETE' && payload?.old?.id) {
            markProjectDeleted(String(payload.old.id));
          }
          if (SupabaseService.isConfigured()) {
            const currentWs = StorageService.getCurrentWorkspace();
            const cloudRes = await StorageService.fetchProjectsCloud(currentWs?.id);
            if (cloudRes.success && Array.isArray(cloudRes.projects)) {
              this.notifyEntityListeners('projects', cloudRes.projects, {
                action: payload?.eventType === 'DELETE' ? 'delete_project' : 'update_project',
                targetId: payload?.old?.id || payload?.new?.id,
              });
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
          if (SupabaseService.isConfigured()) {
            const freshUsers = await StorageService.fetchRegisteredUsersCloud();
            if (Array.isArray(freshUsers) && freshUsers.length > 0) {
              this.notifyEntityListeners('users', freshUsers, {
                action: 'supabase_profiles_changed',
              });
            }
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.isSupabaseSubscribed = true;
            this.setStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.isSupabaseSubscribed = false;
            if (!this.supabaseReconnectTimer && SupabaseService.isConfigured()) {
              this.supabaseReconnectTimer = setTimeout(() => {
                this.supabaseReconnectTimer = null;
                this.setupSupabaseRealtime();
              }, 5000);
            }
          }
        });

      this.supabaseChannel = channel;
    } catch (e) {
      console.warn('Erro ao conectar Supabase Realtime:', e);
    }
  }

  private handleSupabaseDbChange(payload: any) {
    try {
      const eventType = payload.eventType; // INSERT, UPDATE, DELETE
      const rowData = payload.new || payload.old;
      if (!rowData) return;

      const currentTasks: any[] = StorageService.getTasks();
      const mapped = SupabaseService.mapRowToTask(rowData);

      let nextTasks: any[];
      if (eventType === 'DELETE') {
        markTaskDeleted(mapped.id);
        nextTasks = currentTasks.filter((t: any) => t.id !== mapped.id);
      } else {
        const deletedIds = getDeletedTaskIds();
        if (deletedIds.includes(mapped.id)) return;
        nextTasks = mergeTaskLists(currentTasks, [mapped], deletedIds);
      }
      this.notifyEntityListeners('tasks', nextTasks, {
        action: `supabase_${eventType.toLowerCase()}`,
        targetId: mapped.id,
      });
    } catch (e) {
      console.warn('Erro ao processar alteração postgres_changes:', e);
    }
  }

  // ==========================================
  // TIER 4: Window Storage Event (todas as entidades)
  // ==========================================
  private setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.newValue) return;
      const entity = STORAGE_KEY_TO_ENTITY[e.key];
      if (!entity) return;
      try {
        const parsed = JSON.parse(e.newValue);
        this.notifyEntityListeners(entity, parsed, { action: 'storage_sync' });
      } catch {}
    });
  }

  // ==========================================
  // Aplicar tombstones de exclusão vindos do servidor
  // ==========================================
  private applyServerTombstones(payload: Record<string, any>) {
    if (!payload || typeof payload !== 'object') return;
    if (Array.isArray(payload.deletedTaskIds)) {
      payload.deletedTaskIds.forEach((id: any) => {
        if (id) markTaskDeleted(String(id));
      });
    }
    if (Array.isArray(payload.deletedProjectIds)) {
      payload.deletedProjectIds.forEach((id: any) => {
        if (id) markProjectDeleted(String(id));
      });
    }
    if (Array.isArray(payload.deletedWorkspaceIds)) {
      payload.deletedWorkspaceIds.forEach((id: any) => {
        if (id) markWorkspaceDeleted(String(id));
      });
    }
  }

  // ==========================================
  // Mensagens Recebidas
  // ==========================================
  private handleIncomingMessage(msg: SyncMessage, _source: 'websocket' | 'broadcast') {
    if (!msg || typeof msg !== 'object') return;

    if (typeof msg.version === 'number') {
      this.updateKnownServerVersion(msg.version);
    }

    // Ignora mensagens enviadas por esta mesma instância
    if (msg.clientId === this.clientId) {
      return;
    }

    if (msg.type === 'INITIAL_STATE' && msg.payload) {
      const incomingAction = String(msg.actionMeta?.action || '');
      const incomingResetAt = msg.actionMeta?.lastResetAt || (msg.payload as any)?.lastResetAt || null;
      const isLiveReset = incomingAction === 'reset_test_data';

      if (incomingResetAt && typeof window !== 'undefined') {
        try {
          const localResetRaw = localStorage.getItem('operatask_clean_v1_last_reset_at');
          const localResetTs = localResetRaw ? Date.parse(localResetRaw) : 0;
          const serverResetTs = Date.parse(incomingResetAt);
          if (!Number.isNaN(serverResetTs) && serverResetTs > (Number.isNaN(localResetTs) ? 0 : localResetTs)) {
            localStorage.setItem('operatask_clean_v1_last_reset_at', incomingResetAt);
          }
        } catch {}
      }

      // Propaga tombstones ANTES de notificar entidades para que exclusões reflitam imediatamente
      this.applyServerTombstones(msg.payload as Record<string, any>);

      Object.entries(msg.payload).forEach(([entity, data]) => {
        if (
          entity === 'lastResetAt' ||
          entity === 'version' ||
          entity === 'deletedTaskIds' ||
          entity === 'deletedProjectIds' ||
          entity === 'deletedWorkspaceIds'
        ) {
          return;
        }
        if (!(entity in ENTITY_TO_STORAGE_KEY)) return;

        const meta = isLiveReset
          ? { action: 'reset_test_data' }
          : incomingAction && incomingAction !== 'initial_sync'
          ? { action: incomingAction }
          : { action: 'initial_sync' };
        this.notifyEntityListeners(entity as SyncEntity, data, meta);
      });
      return;
    }

    if (msg.type === 'SYNC_UPDATE' && msg.entity && msg.payload !== undefined) {
      this.notifyEntityListeners(msg.entity, msg.payload, msg.actionMeta);
    }
  }

  private notifyEntityListeners(entity: SyncEntity, data: any, meta?: SyncMessage['actionMeta']) {
    const storageKey = ENTITY_TO_STORAGE_KEY[entity];
    let resolvedData = data;
    const action = String(meta?.action || '');
    const isDestructiveAction =
      action.includes('delete') || action.includes('reset') || action.includes('replace');

    const isAuthoritativeWorkspaceAction =
      isDestructiveAction ||
      action === 'update_workspace' ||
      action === 'remove_member' ||
      action === 'sync_user_workspaces' ||
      action === 'reorder_workspaces' ||
      action === 'storage_sync';

    const isAuthoritativeProjectAction =
      isDestructiveAction ||
      action === 'update_project' ||
      action === 'delete_column' ||
      action === 'archive_column' ||
      action === 'reorder_columns' ||
      action === 'update_column' ||
      action === 'storage_sync';

    if (entity === 'tasks' && isDestructiveAction && meta?.targetId) {
      markTaskDeleted(meta.targetId);
    }
    if (entity === 'projects' && action.includes('delete') && !action.includes('column') && meta?.targetId) {
      markProjectDeleted(meta.targetId);
    }
    if (entity === 'workspaces' && action === 'delete_workspace' && meta?.targetId) {
      markWorkspaceDeleted(meta.targetId);
    }

    if (
      storageKey &&
      typeof window !== 'undefined' &&
      Array.isArray(data) &&
      entity === 'tasks'
    ) {
      const deletedIds = getDeletedTaskIds();
      const deletedSet = new Set(deletedIds);
      if (isDestructiveAction) {
        resolvedData = data.filter((t: any) => t && t.id && !deletedSet.has(t.id));
      } else {
        try {
          const existingRaw = localStorage.getItem(storageKey);
          const existingArr = existingRaw ? JSON.parse(existingRaw) : [];
          if (Array.isArray(existingArr)) {
            resolvedData = mergeTaskLists(existingArr, data, deletedIds);
          } else {
            resolvedData = data.filter((t: any) => t && t.id && !deletedSet.has(t.id));
          }
        } catch {}
      }
    } else if (
      storageKey &&
      typeof window !== 'undefined' &&
      Array.isArray(data) &&
      entity === 'workspaces'
    ) {
      const deletedWsSet = new Set(getDeletedWorkspaceIds());
      if (isDestructiveAction) {
        resolvedData = data.filter((w: any) => w?.id && !deletedWsSet.has(w.id));
      } else {
        try {
          const existingRaw = localStorage.getItem(storageKey);
          const existingArr = existingRaw ? JSON.parse(existingRaw) : [];
          if (Array.isArray(existingArr) && existingArr.length > 0) {
            const map = new Map<string, any>();
            existingArr.forEach((item: any) => {
              if (item?.id && !deletedWsSet.has(item.id)) map.set(item.id, item);
            });
            data.forEach((incoming: any) => {
              if (!incoming?.id || deletedWsSet.has(incoming.id)) return;
              const prev = map.get(incoming.id);
              if (prev) {
                if (isAuthoritativeWorkspaceAction && Array.isArray(incoming.members)) {
                  map.set(incoming.id, { ...prev, ...incoming, members: incoming.members });
                } else {
                  const memberMap = new Map<string, any>();
                  (Array.isArray(prev.members) ? prev.members : []).forEach((m: any) => {
                    if (m && m.userId) memberMap.set(m.userId, m);
                  });
                  (Array.isArray(incoming.members) ? incoming.members : []).forEach((m: any) => {
                    if (m && m.userId) memberMap.set(m.userId, m);
                  });
                  map.set(incoming.id, {
                    ...prev,
                    ...incoming,
                    members: Array.from(memberMap.values()),
                  });
                }
              } else {
                map.set(incoming.id, incoming);
              }
            });
            resolvedData = Array.from(map.values());
          } else {
            resolvedData = data.filter((w: any) => w?.id && !deletedWsSet.has(w.id));
          }
        } catch {}
      }
    } else if (
      storageKey &&
      typeof window !== 'undefined' &&
      Array.isArray(data) &&
      entity === 'projects'
    ) {
      const deletedProjSet = new Set(getDeletedProjectIds());
      const deletedWsSet = new Set(getDeletedWorkspaceIds());
      if (isDestructiveAction) {
        resolvedData = data.filter(
          (p: any) => p?.id && !deletedProjSet.has(p.id) && !deletedWsSet.has(p.workspaceId)
        );
      } else {
        try {
          const existingRaw = localStorage.getItem(storageKey);
          const existingArr = existingRaw ? JSON.parse(existingRaw) : [];
          let localTasksForCols: any[] = [];
          if (!isAuthoritativeProjectAction) {
            try {
              const rawTasks = localStorage.getItem('operatask_clean_v1_tasks');
              const parsedTasks = rawTasks ? JSON.parse(rawTasks) : [];
              if (Array.isArray(parsedTasks)) localTasksForCols = parsedTasks;
            } catch {}
          }

          if (Array.isArray(existingArr) && existingArr.length > 0) {
            const map = new Map<string, any>();
            existingArr.forEach((item: any) => {
              if (item?.id && !deletedProjSet.has(item.id) && !deletedWsSet.has(item.workspaceId)) {
                map.set(item.id, item);
              }
            });
            data.forEach((incoming: any) => {
              if (!incoming?.id || deletedProjSet.has(incoming.id) || deletedWsSet.has(incoming.workspaceId)) {
                return;
              }
              const prev = map.get(incoming.id);
              if (prev) {
                const resolvedCols =
                  isAuthoritativeProjectAction && Array.isArray(incoming.columns)
                    ? incoming.columns
                    : mergeProjectColumns(prev.columns, incoming.columns, incoming.id, localTasksForCols);
                map.set(incoming.id, { ...prev, ...incoming, columns: resolvedCols });
              } else {
                map.set(incoming.id, incoming);
              }
            });
            resolvedData = Array.from(map.values());
          } else {
            resolvedData = data.filter(
              (p: any) => p?.id && !deletedProjSet.has(p.id) && !deletedWsSet.has(p.workspaceId)
            );
          }
        } catch {}
      }
    } else if (
      storageKey &&
      typeof window !== 'undefined' &&
      Array.isArray(data) &&
      !isDestructiveAction &&
      (entity === 'users' || entity === 'clients')
    ) {
      try {
        const existingRaw = localStorage.getItem(storageKey);
        const existingArr = existingRaw ? JSON.parse(existingRaw) : [];
        if (Array.isArray(existingArr) && existingArr.length > 0) {
          const map = new Map<string, any>();
          existingArr.forEach((item: any) => {
            if (item && item.id) map.set(item.id, item);
          });
          data.forEach((incoming: any) => {
            if (!incoming || !incoming.id) return;
            const prev = map.get(incoming.id);
            map.set(incoming.id, prev ? { ...prev, ...incoming } : incoming);
          });
          resolvedData = Array.from(map.values());
        }
      } catch {}
    }

    if (storageKey && typeof window !== 'undefined' && resolvedData !== undefined) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(resolvedData));
      } catch {}
    }

    const entityListeners = this.listeners.get(entity);
    if (!entityListeners || entityListeners.size === 0) return;

    entityListeners.forEach((callback) => {
      try {
        callback(resolvedData, meta);
      } catch (err) {
        console.error(`Erro no listener realtime de ${entity}:`, err);
      }
    });
  }

  public async fetchServerState(force = false): Promise<boolean> {
    if (typeof window === 'undefined' || !isServerApiAvailable()) return false;
    if (this.isFetchingServerState) return false;
    this.isFetchingServerState = true;

    try {
      const qs = !force && this.lastServerVersion > 0 ? `?since=${this.lastServerVersion}` : '';
      const res = await fetch(`/api/sync/state${qs}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const nextVersion = Number(json.version || json.data?.version || 0);
        if (nextVersion > 0) {
          this.updateKnownServerVersion(nextVersion);
        }

        if (json.unchanged === true) {
          return true;
        }

        const data = json.data || json;
        if (data && typeof data === 'object') {
          const serverResetAt = data.lastResetAt || json.lastResetAt || null;
          try {
            const localResetRaw = localStorage.getItem('operatask_clean_v1_last_reset_at');
            const localResetTs = localResetRaw ? Date.parse(localResetRaw) : 0;
            const serverResetTs = serverResetAt ? Date.parse(serverResetAt) : 0;
            if (!Number.isNaN(serverResetTs) && serverResetTs > (Number.isNaN(localResetTs) ? 0 : localResetTs)) {
              localStorage.setItem('operatask_clean_v1_last_reset_at', serverResetAt);
            }
          } catch {}

          // Aplica tombstones recebidos do servidor ANTES de notificar as entidades
          this.applyServerTombstones(data);

          const syncAction = 'http_sync';
          Object.entries(data).forEach(([entity, val]) => {
            if (
              entity === 'lastResetAt' ||
              entity === 'version' ||
              entity === 'deletedTaskIds' ||
              entity === 'deletedProjectIds' ||
              entity === 'deletedWorkspaceIds'
            ) {
              return;
            }
            if (!(entity in ENTITY_TO_STORAGE_KEY)) return;
            this.notifyEntityListeners(entity as SyncEntity, val, { action: syncAction });
          });
          return true;
        }
      } else if (res.status === 404) {
        setServerApiAvailable(false);
      }
    } catch (e) {
      // NUNCA desabilita permanentemente o servidor em quedas transitórias de rede mobile (4G/5G/Wi-Fi)
      console.warn('Falha temporária ao sincronizar estado com o servidor:', e);
    } finally {
      this.isFetchingServerState = false;
    }
    return false;
  }

  // ==========================================
  // Publicar Atualização
  // ==========================================
  public broadcast<T = any>(
    entity: SyncEntity,
    payload: T,
    actionMeta?: SyncMessage['actionMeta']
  ) {
    const message: SyncMessage<T> = {
      type: 'SYNC_UPDATE',
      entity,
      payload,
      clientId: this.clientId,
      timestamp: new Date().toISOString(),
      actionMeta,
    };

    // 1. BroadcastChannel (outras abas no mesmo navegador)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {
        console.warn('Falha no broadcast local:', e);
      }
    }

    // 2. WebSocket (outros dispositivos conectados: Android, iOS, computadores)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        console.warn('Falha no envio WebSocket (enfileirado para reconexão):', e);
        this.pendingWsBroadcasts.set(entity, message);
      }
    } else {
      // Guarda a atualização mais recente por entidade para enviar assim que o WS reconectar
      this.pendingWsBroadcasts.set(entity, message);
    }

    // 3. Supabase Realtime Broadcast (multiplataforma: Android, iOS, Computador)
    if (this.supabaseChannel && this.isSupabaseSubscribed) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'entity_sync',
          payload: message,
        });
      } catch (e) {
        console.warn('Falha no broadcast Supabase:', e);
      }
    }
  }

  // ==========================================
  // Assinar Entidade
  // ==========================================
  public subscribe<T = any>(
    entity: SyncEntity,
    callback: EntityListener<T>
  ): () => void {
    if (!this.listeners.has(entity)) {
      this.listeners.set(entity, new Set());
    }

    const set = this.listeners.get(entity)!;
    set.add(callback as EntityListener);

    return () => {
      set.delete(callback as EntityListener);
    };
  }
}

export const RealtimeService = new RealtimeServiceImpl();
