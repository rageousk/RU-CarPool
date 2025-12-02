import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import "../css/UserDashboard.css"; // Reuse dashboard styles

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function MessagesPage() {
    const [conversations, setConversations] = useState([]);
    const [selectedConvId, setSelectedConvId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Get current user from local storage or context (simplified here)
        // In a real app, you might want to use a Context for this
        const fetchUserAndConvs = async () => {
            const token = localStorage.getItem("ru_token");
            if (!token) {
                navigate("/login");
                return;
            }

            try {
                // 1. Get User ID (we need it to know who is "me")
                const userRes = await fetch(`${apiBase}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!userRes.ok) throw new Error("Failed to get user");
                const userData = await userRes.json();
                setCurrentUser(userData.profile);

                // 2. Get Conversations
                const convRes = await fetch(`${apiBase}/api/messages/conversations`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (convRes.ok) {
                    const convData = await convRes.json();
                    setConversations(convData.conversations || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndConvs();
    }, [navigate]);

    const getOtherPartyName = (conv) => {
        if (!currentUser) return "User";
        // If I am the rider, show driver name. If I am driver, show rider name.
        return conv.rider_id === currentUser.id
            ? `${conv.driver?.first_name || "Driver"} ${conv.driver?.last_name || ""}`
            : `${conv.rider?.first_name || "Rider"} ${conv.rider?.last_name || ""}`;
    };

    return (
        <div className="dashboard-app-layout" style={{ height: "100vh" }}>
            <header className="app-header-nav" style={{ justifyContent: "flex-start", paddingLeft: "20px" }}>
                <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px" }}>
                    ← Back to Dashboard
                </button>
                <h2 style={{ color: "white", marginLeft: "20px" }}>Messages</h2>
            </header>

            <div className="app-main-content" style={{ display: "flex", padding: 0, height: "calc(100vh - 60px)" }}>
                {/* Sidebar List */}
                <div style={{ width: "300px", borderRight: "1px solid #eee", overflowY: "auto", background: "#f8f9fa" }}>
                    {loading && <div style={{ padding: "20px" }}>Loading...</div>}
                    {!loading && conversations.length === 0 && (
                        <div style={{ padding: "20px", color: "#666" }}>No conversations yet.</div>
                    )}
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => setSelectedConvId(conv.id)}
                            style={{
                                padding: "15px",
                                borderBottom: "1px solid #eee",
                                cursor: "pointer",
                                background: selectedConvId === conv.id ? "white" : "transparent",
                                borderLeft: selectedConvId === conv.id ? "4px solid #007bff" : "4px solid transparent"
                            }}
                        >
                            <div style={{ fontWeight: "600", marginBottom: "4px" }}>{getOtherPartyName(conv)}</div>
                            <div style={{ fontSize: "12px", color: "#666" }}>
                                Trip: {conv.demand?.origin?.split(",")[0]} → {conv.demand?.destination?.split(",")[0]}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat Area */}
                <div style={{ flex: 1, background: "white" }}>
                    {selectedConvId ? (
                        <ChatWindow
                            conversationId={selectedConvId}
                            currentUser={currentUser}
                            onClose={() => setSelectedConvId(null)}
                        />
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
                            Select a conversation to start chatting
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
