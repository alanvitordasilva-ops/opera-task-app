/**
 * OperaTask Realtime Synchronization Service
 * 
 * Provides unified, multi-tier real-time sync across Web and Mobile:
 * 1. Native WebSocket on /ws for instant cross-device updates (phone <-> desktop)
 * 2. BroadcastChannel + Storage events for 0ms cross-tab synchronization
 * 3. Supabase Realtime channel when cloud connection is configured
 */

import { SupabaseService } from './supabaseService.ts';
import { StorageService, isServerApiAvailable, setServerApiAvailable } from './storage.ts';

export type SyncEntity =
  | 'tasks'
  | 'projects'
  | 'workspaces'
  | 'fichas_tecnicas'
  | 'users'
  | 'tags'
  | 'activities'
  | 'clients'
  | 'subscription_plans';

export interface SyncMessage<T = any> {
  type: 'SYNC_UPDATE' | 'INITIAL_STATE' | 'PING' | 'PONG';
  entity?: SyncEntity;
  payload?: T;
  clientId: string;
  timestamp: string;
  actionMeta?: {
    action: string;
    targetId?: string;
    userName?: string;
  };
}

type EntityListener<T = any> = (data: T, meta?: SyncMessage['actionMeta']) => void;
type ConnectionStatusListener = (status: 'connected' | 'reconnecting' | 'offline') => void;

class RealtimeServiceImpl {
  private clientId: string;
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<SyncEntity, Set<EntityListener>> = new Map();
  private statusListeners: Set<ConnectionStatusListener> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private connectionStatus: 'connected' | 'reconnecting' | 'offline' = 'offline';
  private supabaseChannel: any = null;
  private isInitialized = false;

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Iniciar canal local BroadcastChannel (cross-tab / cross-window instantâneo)
    this.setupBroadcastChannel();

    // 2. Iniciar conexão WebSocket com o servidor OperaTask
    this.connectWebSocket();

    // 3. Fallback de evento de storage
    this.setupStorageListener();

    // 4. Iniciar canal Supabase Realtime se habilitado
    this.setupSupabaseRealtime();

    // 5. Carregar estado compartilhado do servidor imediatamente
    this.fetchServerState();

    // 6. Resincronização automática ao focar a aba ou retornar do background no celular (Android / iOS)
    window.addEventListener('focus', () => {
      this.resyncOnActive();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.resyncOnActive();
      }
    });
  }

  public async resyncOnActive() {
    try {
      if (SupabaseService.isConfigured()) {
        const curWsId = StorageService.getCurrentWorkspace()?.id;
        if (curWsId) {
          const cloudRes = await StorageService.fetchTasksCloud(curWsId);
          if (cloudRes.success && Array.isArray(cloudRes.tasks) && cloudRes.tasks.length > 0) {
            this.notifyEntityListeners('tasks', cloudRes.tasks, { action: 'cloud_resync' });
          }
        }
        const wsRes = await StorageService.fetchWorkspacesCloud();
        if (wsRes.success && Array.isArray(wsRes.workspaces) && wsRes.workspaces.length > 0) {
          this.notifyEntityListeners('workspaces', wsRes.workspaces, { action: 'cloud_resync' });
        }
      }
      this.fetchServerState();
    } catch (e) {
      console.warn('Erro ao re-sincronizar no foco:', e);
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
  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg, 'websocket');
        } catch (e) {
          console.warn('Erro ao decodificar mensagem WebSocket:', e);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('reconnecting');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
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
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
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

      if (this.supabaseChannel) {
        try {
          client.removeChannel(this.supabaseChannel);
        } catch {}
      }

      this.supabaseChannel = client
        .channel('operatask-live-sync', {
          config: {
            broadcast: { ack: false, self: false },
          },
        })
        .on(
          'broadcast',
          { event: 'entity_sync' },
          (eventData: any) => {
            if (eventData && eventData.payload) {
              this.handleIncomingMessage(eventData.payload, 'broadcast');
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cards' },
          (payload: any) => {
            this.handleSupabaseDbChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload: any) => {
            this.handleSupabaseDbChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workspaces' },
          async () => {
            if (SupabaseService.isConfigured()) {
              const cloudRes = await StorageService.fetchWorkspacesCloud();
              if (cloudRes.success && Array.isArray(cloudRes.workspaces)) {
                this.notifyEntityListeners('workspaces', cloudRes.workspaces, {
                  action: 'supabase_workspaces_changed',
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tenants' },
          async () => {
            if (SupabaseService.isConfigured()) {
              const cloudRes = await StorageService.fetchClientsCloud();
              if (cloudRes.success && Array.isArray(cloudRes.clients)) {
                this.notifyEntityListeners('clients', cloudRes.clients, {
                  action: 'supabase_tenants_changed',
                });
              }
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('connected');
          }
        });
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
        nextTasks = currentTasks.filter((t: any) => t.id !== mapped.id);
      } else {
        const exists = currentTasks.some((t: any) => t.id === mapped.id);
        if (exists) {
          nextTasks = currentTasks.map((t: any) => (t.id === mapped.id ? { ...t, ...mapped } : t));
        } else {
          nextTasks = [mapped, ...currentTasks];
        }
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
  // TIER 4: Window Storage Event
  // ==========================================
  private setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if (e.key === 'operatask_clean_v1_tasks' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.notifyEntityListeners('tasks', parsed, { action: 'storage_sync' });
        } catch {}
      } else if (e.key === 'operatask_clean_v1_projects' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.notifyEntityListeners('projects', parsed, { action: 'storage_sync' });
        } catch {}
      } else if (e.key === 'operatask_clean_v1_workspaces' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.notifyEntityListeners('workspaces', parsed, { action: 'storage_sync' });
        } catch {}
      } else if (e.key === 'operatask_clean_v1_fichas_tecnicas' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.notifyEntityListeners('fichas_tecnicas', parsed, { action: 'storage_sync' });
        } catch {}
      }
    });
  }

  // ==========================================
  // Mensagens Recebidas
  // ==========================================
  private handleIncomingMessage(msg: SyncMessage, _source: 'websocket' | 'broadcast') {
    if (!msg || typeof msg !== 'object') return;

    // Ignora mensagens enviadas por esta mesma instância
    if (msg.clientId === this.clientId) {
      return;
    }

    if (msg.type === 'INITIAL_STATE' && msg.payload) {
      Object.entries(msg.payload).forEach(([entity, data]) => {
        this.notifyEntityListeners(entity as SyncEntity, data, { action: 'initial_sync' });
      });
      return;
    }

    if (msg.type === 'SYNC_UPDATE' && msg.entity && msg.payload) {
      this.notifyEntityListeners(msg.entity, msg.payload, msg.actionMeta);
    }
  }

  private notifyEntityListeners(entity: SyncEntity, data: any, meta?: SyncMessage['actionMeta']) {
    const entityToKey: Record<SyncEntity, string> = {
      users: 'operatask_clean_v1_users',
      workspaces: 'operatask_clean_v1_workspaces',
      projects: 'operatask_clean_v1_projects',
      tasks: 'operatask_clean_v1_tasks',
      fichas_tecnicas: 'operatask_clean_v1_fichas_tecnicas',
      tags: 'operatask_clean_v1_tags',
      activities: 'operatask_clean_v1_activities',
      clients: 'operatask_clean_v1_clients',
      subscription_plans: 'operatask_clean_v1_subscription_plans',
    };
    const storageKey = entityToKey[entity];
    if (storageKey && typeof window !== 'undefined' && data) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {}
    }

    const entityListeners = this.listeners.get(entity);
    if (!entityListeners || entityListeners.size === 0) return;

    entityListeners.forEach((callback) => {
      try {
        callback(data, meta);
      } catch (err) {
        console.error(`Erro no listener realtime de ${entity}:`, err);
      }
    });
  }

  public async fetchServerState(): Promise<boolean> {
    if (typeof window === 'undefined' || !isServerApiAvailable()) return false;
    try {
      const res = await fetch('/api/sync/state');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([entity, val]) => {
            this.notifyEntityListeners(entity as SyncEntity, val, { action: 'http_sync' });
          });
          return true;
        }
      } else if (res.status === 404) {
        setServerApiAvailable(false);
      }
    } catch (e) {
      setServerApiAvailable(false);
      console.warn('Falha ao sincronizar estado com o servidor:', e);
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

    // 2. WebSocket (outros dispositivos conectados: celulares, computadores)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        console.warn('Falha no envio WebSocket:', e);
      }
    }

    // 3. Supabase Realtime Broadcast (multiplataforma: Android, iOS, Computador)
    if (this.supabaseChannel) {
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
