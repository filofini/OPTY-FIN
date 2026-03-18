import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const WEBSOCKET_URL = `${BASE_URL.replace(/^http/, 'ws')}/api/ws`;

export const useWebSocket = (onUpdate: () => void) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    useEffect(() => {
        let ws: WebSocket;
        let reconnectTimeout: any;

        const connect = () => {
            ws = new WebSocket(WEBSOCKET_URL);

            ws.onopen = () => {
                setStatus('connected');
                console.log("WebSocket Connected");
            };

            ws.onmessage = (event) => {
                if (event.data === 'UPDATE') {
                    onUpdate();
                }
            };

            ws.onclose = () => {
                setStatus('disconnected');
                console.log("WebSocket Disconnected. Reconnecting in 3s...");
                reconnectTimeout = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error("WebSocket Error:", err);
                ws.close();
            };
        };

        connect();

        return () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws) ws.close();
        };
    }, [onUpdate]);

    return { status };
};
