import { useEffect, useRef, useState, useCallback } from 'react';

interface ShadowState {
  out1_state: number;
  out2_state: number;
  motor_speed: number;
  power_saving: number;
  in1_state: number;
  in2_state: number;
  charging: number;
  connection_status: string;
}

interface ShadowUpdateMessage {
  type: 'SHADOW_UPDATE';
  client_id: string;
  timestamp: number;
  reported: ShadowState;
  desired: Partial<ShadowState>;
}

interface UseDeviceShadowWebSocketOptions {
  clientId: string;
  websocketUrl: string;
  onStateUpdate?: (state: ShadowState) => void;
  enabled?: boolean;
}

export function useDeviceShadowWebSocket({
  clientId,
  websocketUrl,
  onStateUpdate,
  enabled = true
}: UseDeviceShadowWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<ShadowState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !websocketUrl || !clientId) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      // Connect with client_id filter
      const url = `${websocketUrl}?client_id=${clientId}`;
      console.log('🔌 Connecting WebSocket:', url);
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: ShadowUpdateMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message);

          if (message.type === 'SHADOW_UPDATE' && message.client_id === clientId) {
            setLastUpdate(message.reported);
            onStateUpdate?.(message.reported);
          }
        } catch (e) {
          console.error('❌ Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect after 3 seconds if not intentionally closed
        if (enabled && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Reconnecting WebSocket...');
            connect();
          }, 3000);
        }
      };
    } catch (e) {
      console.error('❌ Error creating WebSocket:', e);
      setError('Failed to create WebSocket connection');
    }
  }, [clientId, websocketUrl, enabled, onStateUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Intentional disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    lastUpdate,
    error,
    reconnect: connect,
    disconnect
  };
}

