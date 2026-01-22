class WebSocketService {
  private ws: WebSocket | null = null;
  private messageListeners: ((data: any) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private url = 'wss://f93e1a5aa39c.ngrok-free.app/ws';

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fullUrl = `${this.url}?token=${token}`;
        console.log(`[WebSocket] Conectando a ${this.url}?token=***`);
        
        this.ws = new WebSocket(fullUrl);

        this.ws.onopen = () => {
          console.log('[WebSocket] Conectado');
          this.reconnectAttempts = 0;
          this.notifyConnectionListeners(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WebSocket] Mensaje recibido:', data);
            
            // Si tiene event type, notificar listeners específicos
            if (data.event) {
              this.notifyEventListeners(data.event, data);
            }
            
            this.notifyMessageListeners(data);
          } catch (error) {
            console.error('[WebSocket] Error al parsear mensaje:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Desconectado');
          this.notifyConnectionListeners(false);
          // Intentar reconectar después de 3 segundos
          if (this.reconnectAttempts < this.maxReconnectAttempts && token) {
            this.reconnectAttempts++;
            console.log(`[WebSocket] Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.reconnectTimeout = setTimeout(() => {
              this.connect(token).catch(err => console.error('[WebSocket] Error en reconexión:', err));
            }, 3000);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] WebSocket no está conectado');
    }
  }

  onMessage(callback: (data: any) => void): () => void {
    this.messageListeners.push(callback);
    // Retornar función para desuscribirse
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }

  onEvent(eventType: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
    
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        this.eventListeners.set(eventType, listeners.filter(cb => cb !== callback));
      }
    };
  }

  private notifyEventListeners(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocket] Error en listener del evento ${eventType}:`, error);
      }
    });
  }

  private notifyMessageListeners(data: any): void {
    this.messageListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[WebSocket] Error en listener de mensaje:', error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('[WebSocket] Error en listener de conexión:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
