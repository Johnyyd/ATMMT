import { GuestbookEntry } from '../types/chat';

export type GuestbookWSEvent =
  | { event: 'new_message'; data: GuestbookEntry }
  | { event: 'like_update'; data: GuestbookEntry }
  | { event: 'message_updated'; data: { id: number; content: string; is_edited: boolean; edited_at?: string | null; author_role?: string } }
  | { event: 'message_deleted'; data: { id: number } }
  | { event: 'online_count'; data: { count: number } }
  | { event: 'typing'; data: { user_token?: string; author_name: string; user_id?: number | null } };

type EventListener = (event: GuestbookWSEvent) => void;

class GuestbookWebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Set<EventListener> = new Set();
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private isConnected = false;
  public lastOnlineCount = 1;
  private clientId = 'cli_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log('[WebSocket] Tab became visible. Reconnecting...');
            this.connect();
          }
        }
      });
    }
  }

  public send(data: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    }
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/guestbook/ws?client_id=${this.clientId}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('[WebSocket] Connected to Guestbook stream:', this.clientId);
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const parsed: GuestbookWSEvent = JSON.parse(event.data);
          this.notifyListeners(parsed);
        } catch (err) {
          console.warn('[WebSocket] Failed to parse message:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        console.log('[WebSocket] Connection closed. Retrying in 2s...');
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocket] Error encountered:', err);
        this.socket?.close();
      };
    } catch (err) {
      console.error('[WebSocket] Failed to create WebSocket connection:', err);
      this.scheduleReconnect();
    }
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);

    if (this.lastOnlineCount > 0) {
      try {
        listener({ event: 'online_count', data: { count: this.lastOnlineCount } });
      } catch (err) {
        console.error('[WebSocket] Initial notify error:', err);
      }
    }

    if (!this.isConnected) {
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: GuestbookWSEvent) {
    if (event.event === 'online_count' && typeof event.data?.count === 'number') {
      this.lastOnlineCount = event.data.count;
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[WebSocket] Listener error:', err);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout !== null) return;
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 2000);
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const guestbookWS = new GuestbookWebSocketClient();
