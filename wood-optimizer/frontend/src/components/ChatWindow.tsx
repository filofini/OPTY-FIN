import React, { useState, useEffect } from 'react';
import { orderApi } from '../api';

const ChatWindow = ({ orderId, role }: { orderId: number, role: 'Office' | 'Production' }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');

    useEffect(() => {
        loadOrder();
        const interval = setInterval(loadOrder, 5000); // Polling for simplicity
        return () => clearInterval(interval);
    }, [orderId]);

    const loadOrder = async () => {
        try {
            const ord = await orderApi.getOne(orderId);
            setMessages(ord.messages || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        try {
            await orderApi.addMessage(orderId, { authorRole: role, text });
            setText('');
            loadOrder();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="card mt-4">
            <h3>Chat Ordine</h3>
            <div className="chat-box mb-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.authorRole.toLowerCase()}`}>
                        <div className="chat-meta">
                            {msg.authorRole} • {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                        <div>{msg.text}</div>
                    </div>
                ))}
                {messages.length === 0 && <div className="text-muted">Nessun messaggio.</div>}
            </div>
            <form className="flex-row" onSubmit={handleSend}>
                <input
                    className="input mb-0"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Scrivi un messaggio..."
                    style={{ marginBottom: 0 }}
                />
                <button type="submit" className="btn-primary">Invia</button>
            </form>
        </div>
    );
};

export default ChatWindow;
