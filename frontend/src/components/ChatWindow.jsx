import React, { useState, useEffect, useRef } from "react";
import "../css/ChatWindow.css";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ChatWindow({ conversationId, currentUser, onClose }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const [pollingInterval, setPollingInterval] = useState(null);

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem("ru_token");
            const res = await fetch(`${apiBase}/api/messages/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const tempMsg = {
            id: "temp-" + Date.now(),
            sender_id: currentUser.id,
            content: newMessage,
            created_at: new Date().toISOString(),
            pending: true,
        };

        // Optimistic update
        setMessages((prev) => [...prev, tempMsg]);
        setNewMessage("");

        try {
            const token = localStorage.getItem("ru_token");
            const res = await fetch(`${apiBase}/api/messages/${conversationId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content: tempMsg.content }),
            });

            if (res.ok) {
                const data = await res.json();
                // Replace temp message with real one
                setMessages((prev) =>
                    prev.map((m) => (m.id === tempMsg.id ? data.message : m))
                );
            } else {
                console.error("Failed to send message");
                // Remove temp message on failure (or show error state)
                setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
            }
        } catch (err) {
            console.error("Error sending message", err);
            setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        }
    };

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Initial fetch and polling
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3s
        setPollingInterval(interval);
        return () => clearInterval(interval);
    }, [conversationId]);

    return (
        <div className="chat-window">
            <div className="chat-header">
                <h3>Chat</h3>
                <button onClick={onClose} className="close-chat">×</button>
            </div>

            <div className="messages-list">
                {loading && <div className="loading-msgs">Loading...</div>}
                {!loading && messages.length === 0 && (
                    <div className="empty-chat">No messages yet. Say hi! 👋</div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser.id;
                    return (
                        <div key={msg.id} className={`message-bubble ${isMe ? "mine" : "theirs"}`}>
                            <div className="msg-content">{msg.content}</div>
                            <div className="msg-time">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" disabled={!newMessage.trim()}>Send</button>
            </form>
        </div>
    );
}
