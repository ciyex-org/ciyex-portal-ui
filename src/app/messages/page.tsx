"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useProviders, useCareTeamProviders, Provider } from "@/hooks/useProviders";
import {
    MessageSquare, Send, Search, PenSquare, X, Paperclip, Pin,
} from "lucide-react";

/* ───── types (matching EHR messaging backend) ───── */
interface Channel {
    id: string;
    name: string;
    type: "public" | "private" | "dm" | "group_dm";
    topic?: string;
    createdBy: string;
    createdAt: string;
    memberCount: number;
    unreadCount: number;
    lastMessage?: MessageItem;
    members?: ChannelMember[];
}

interface ChannelMember {
    userId: string;
    displayName: string;
    role: string;
    lastReadAt?: string;
}

interface MessageItem {
    id: string;
    channelId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: { initials: string; color: string };
    content: string;
    createdAt: string;
    parentId?: string;
    isPinned?: boolean;
    isEdited?: boolean;
    isDeleted?: boolean;
    reactions?: { emoji: string; count: number; users: string[]; hasReacted: boolean }[];
    attachments?: { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number }[];
    isSystem?: boolean;
}

/* ───── API helper ───── */
async function api<T>(path: string, opts?: RequestInit): Promise<T | null> {
    try {
        const res = await fetchWithAuth(path, opts);
        if (!res.ok) return null;
        const d = await res.json();
        return d.data ?? d;
    } catch { return null; }
}

/** Convert Java date arrays [y,m,d,h,min,...] or strings to ISO string */
function normDate(v: unknown): string {
    if (!v) return new Date().toISOString();
    if (Array.isArray(v)) {
        const [y, m = 1, d = 1, h = 0, min = 0, s = 0] = v as number[];
        return new Date(y, m - 1, d, h, min, s).toISOString();
    }
    return String(v);
}

/* ───── Page ───── */
export default function MessagesPage() {
    const { providers } = useCareTeamProviders();
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserName, setCurrentUserName] = useState("");
    const [currentUserIds, setCurrentUserIds] = useState<string[]>([]);

    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState("");
    const [showNewMsg, setShowNewMsg] = useState(false);
    const [providerSearch, setProviderSearch] = useState("");
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; channelId: string } | null>(null);

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (user) {
            try {
                const u = JSON.parse(user);
                const uid = u.sub || u.id || u.userId || u.email || u.username || "";
                setCurrentUserId(uid);
                setCurrentUserName(u.name || u.firstName || [u.given_name, u.family_name].filter(Boolean).join(" ") || u.preferred_username || "Patient");
                // Collect all possible user identifiers for matching senderId
                const ids = [uid, u.sub, u.id, u.userId, u.email, u.username, u.preferred_username, String(u.patientId || "")].filter(Boolean).map(String);
                setCurrentUserIds([...new Set(ids)]);
            } catch { /* ignore parse errors */ }
        }
    }, []);

    /* load channels */
    useEffect(() => {
        if (!currentUserId) {
            setLoadingChannels(false);
            return;
        }
        (async () => {
            try {
                const data = await api<Channel[]>("/api/channels");
                const list = Array.isArray(data) ? data : [];
                // portal: only show DM conversations that have messages; normalize dates
                setChannels(list.filter((c) => (c.type === "dm" || c.type === "group_dm") && c.lastMessage).map((c: any) => ({
                    ...c,
                    createdAt: normDate(c.createdAt),
                    lastMessage: c.lastMessage ? { ...c.lastMessage, createdAt: normDate(c.lastMessage.createdAt) } : c.lastMessage,
                })));
            } catch (e) {
                console.error("Failed to load channels:", e);
            } finally {
                setLoadingChannels(false);
            }
        })();
    }, [currentUserId]);

    /* load messages when channel changes */
    useEffect(() => {
        if (!activeChannelId) { setMessages([]); return; }
        setLoadingMessages(true);
        (async () => {
            try {
                const data = await api<MessageItem[]>(`/api/channels/${activeChannelId}/messages?limit=100`);
                const msgs = Array.isArray(data) ? data : [];
                setMessages(msgs.map((m: any) => ({ ...m, createdAt: normDate(m.createdAt) })));
                // mark read and update local state
                fetchWithAuth(`/api/channels/${activeChannelId}/read`, { method: "POST" }).catch(() => {});
                setChannels((prev) => prev.map((c) => c.id === activeChannelId ? { ...c, unreadCount: 0 } : c));
            } catch (e) {
                console.error("Failed to load messages:", e);
            } finally {
                setLoadingMessages(false);
            }
        })();
    }, [activeChannelId]);

    /* send message */
    const sendMessage = useCallback(async (content: string) => {
        if (!activeChannelId || !content.trim()) return;
        const msg = await api<MessageItem>(`/api/channels/${activeChannelId}/messages`, {
            method: "POST",
            body: JSON.stringify({ content: content.trim() }),
        });
        if (msg) {
            setMessages((prev) => [...prev, msg]);
            setChannels((prev) =>
                prev.map((c) => c.id === activeChannelId ? { ...c, lastMessage: msg, unreadCount: 0 } : c)
            );
        }
    }, [activeChannelId]);

    /* start DM with provider */
    const startDm = useCallback(async (provider: Provider) => {
        // Prefer Keycloak UUID, fall back to email (backend will resolve to UUID)
        const userId = provider.keycloakUserId || provider.email || `provider-${provider.id}`;
        const data = await api<Channel>("/api/channels/dm", {
            method: "POST",
            body: JSON.stringify({ targetUserId: userId, targetUserName: provider.fullName }),
        });
        if (data) {
            setChannels((prev) => {
                const exists = prev.find((c) => c.id === data.id);
                return exists ? prev : [data, ...prev];
            });
            setActiveChannelId(data.id);
            setShowNewMsg(false);
        }
    }, []);

    /* mark read / unread */
    const markAsRead = useCallback(async (channelId: string) => {
        await api("/api/channels/" + channelId + "/read", { method: "POST" });
        setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, unreadCount: 0 } : c));
    }, []);

    const markAsUnread = useCallback(async (channelId: string) => {
        await api("/api/channels/" + channelId + "/unread", { method: "POST" });
        setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, unreadCount: Math.max(c.unreadCount, 1) } : c));
    }, []);

    /* helpers */
    const activeChannel = channels.find((c) => c.id === activeChannelId) || null;

    const dmName = useCallback((ch: Channel) => {
        if (ch.members?.length) {
            const other = ch.members.find((m) => m.userId !== currentUserId);
            if (other) return other.displayName;
        }
        const parts = ch.name.split(" & ");
        return parts.find((p) => !p.toLowerCase().includes(currentUserName.toLowerCase().split(" ")[0])) || ch.name;
    }, [currentUserId, currentUserName]);

    const filteredChannels = useMemo(() => {
        let list = channels;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((c) => dmName(c).toLowerCase().includes(q));
        }
        // Sort: unread first, then by last message time (most recent on top)
        return [...list].sort((a, b) => {
            // Unread channels first
            const aUnread = a.unreadCount > 0 ? 1 : 0;
            const bUnread = b.unreadCount > 0 ? 1 : 0;
            if (bUnread !== aUnread) return bUnread - aUnread;
            // Then by last message time
            const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [channels, search, dmName]);

    const filteredProviders = useMemo(() => {
        if (!providerSearch.trim()) return providers;
        const q = providerSearch.toLowerCase();
        return providers.filter((p) =>
            p.fullName?.toLowerCase().includes(q) ||
            p.professionalDetails?.specialty?.toLowerCase()?.includes(q)
        );
    }, [providers, providerSearch]);

    const groupedMessages = useMemo(() => {
        const groups: { date: string; items: MessageItem[] }[] = [];
        let lastDate = "";
        for (const m of messages) {
            const d = new Date(m.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
            if (d !== lastDate) { lastDate = d; groups.push({ date: d, items: [] }); }
            groups[groups.length - 1].items.push(m);
        }
        return groups;
    }, [messages]);

    return (
        <AdminLayout>
            <div className="flex h-full overflow-hidden">
                {/* ── Sidebar ── */}
                <div className="w-72 shrink-0 flex flex-col border-r border-gray-200 bg-gray-50">
                    {/* sidebar header */}
                    <div className="flex items-center justify-between h-[49px] px-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                            <h2 className="text-sm font-semibold text-gray-900">Messages</h2>
                        </div>
                        <button
                            onClick={() => setShowNewMsg(true)}
                            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                            title="New message"
                        >
                            <PenSquare className="h-4 w-4 text-gray-600" />
                        </button>
                    </div>

                    {/* search */}
                    <div className="px-3 py-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                        </div>
                    </div>

                    {/* channel list */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingChannels ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                            </div>
                        ) : filteredChannels.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No conversations yet</p>
                                <button
                                    onClick={() => setShowNewMsg(true)}
                                    className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Start a conversation
                                </button>
                            </div>
                        ) : (
                            <div className="px-1.5 py-1">
                                {filteredChannels.map((ch) => {
                                    const name = dmName(ch);
                                    const active = ch.id === activeChannelId;
                                    const hasUnread = ch.unreadCount > 0;
                                    const preview = ch.lastMessage?.content || "";
                                    const time = ch.lastMessage?.createdAt ? relTime(ch.lastMessage.createdAt) : "";
                                    return (
                                        <button
                                            key={ch.id}
                                            onClick={() => { setActiveChannelId(ch.id); if (hasUnread) markAsRead(ch.id); }}
                                            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, channelId: ch.id }); }}
                                            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                                                active ? "bg-blue-50 ring-1 ring-blue-200"
                                                    : hasUnread ? "bg-blue-50/60 hover:bg-blue-50"
                                                    : "hover:bg-gray-100"
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white ${avatarColor(name)}`}>
                                                    {nameInitials(name)}
                                                </div>
                                                {hasUnread && (
                                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm truncate ${
                                                        hasUnread ? "font-bold text-gray-900"
                                                            : active ? "font-semibold text-blue-900"
                                                            : "font-medium text-gray-900"
                                                    }`}>
                                                        {name}
                                                    </span>
                                                    {time && <span className={`text-[11px] shrink-0 ml-2 ${hasUnread ? "font-semibold text-blue-600" : "text-gray-400"}`}>{time}</span>}
                                                </div>
                                                <p className={`text-xs truncate mt-0.5 ${hasUnread ? "font-medium text-gray-700" : "text-gray-500"}`}>
                                                    {preview || "No messages yet"}
                                                </p>
                                            </div>
                                            {hasUnread && (
                                                <span className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                                    {ch.unreadCount > 9 ? "9+" : ch.unreadCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Context menu for mark read/unread */}
                {contextMenu && (
                    <div
                        className="fixed inset-0 z-50"
                        onClick={() => setContextMenu(null)}
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                    >
                        <div
                            className="absolute bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                        >
                            {(() => {
                                const ch = channels.find((c) => c.id === contextMenu.channelId);
                                const isUnread = ch && ch.unreadCount > 0;
                                return (
                                    <>
                                        <button
                                            onClick={() => { markAsRead(contextMenu.channelId); setContextMenu(null); }}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${!isUnread ? "text-gray-400" : "text-gray-700"}`}
                                            disabled={!isUnread}
                                        >
                                            Mark as read
                                        </button>
                                        <button
                                            onClick={() => { markAsUnread(contextMenu.channelId); setContextMenu(null); }}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${isUnread ? "text-gray-400" : "text-gray-700"}`}
                                            disabled={!!isUnread}
                                        >
                                            Mark as unread
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ── Main Message Panel ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {activeChannel ? (
                        <>
                            {/* Channel header */}
                            <div className="flex items-center justify-between h-[49px] px-5 border-b border-gray-200 bg-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${avatarColor(dmName(activeChannel))}`}>
                                        {nameInitials(dmName(activeChannel))}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 truncate">{dmName(activeChannel)}</h3>
                                        <p className="text-xs text-gray-500">
                                            {activeChannel.memberCount} member{activeChannel.memberCount !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <MessageList
                                groups={groupedMessages}
                                loading={loadingMessages}
                                currentUserId={currentUserId}
                                currentUserIds={currentUserIds}
                                currentUserName={currentUserName}
                            />

                            {/* Compose */}
                            <ComposeBar
                                channelName={dmName(activeChannel)}
                                onSend={sendMessage}
                            />
                        </>
                    ) : (
                        /* Empty state */
                        <div className="flex-1 flex items-center justify-center bg-gray-50/50">
                            <div className="text-center max-w-sm">
                                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Messages</h3>
                                <p className="text-sm text-gray-500 mb-5">
                                    Send secure messages to your care team. Select a conversation or start a new one.
                                </p>
                                <button
                                    onClick={() => setShowNewMsg(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <PenSquare className="h-4 w-4" /> New Message
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── New Message Picker ── */}
                {showNewMsg && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-20">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900">New Message</h3>
                                <button onClick={() => setShowNewMsg(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <X className="h-4 w-4 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-4">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        value={providerSearch}
                                        onChange={(e) => setProviderSearch(e.target.value)}
                                        placeholder="Search providers..."
                                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-0.5">
                                    {filteredProviders.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-8">No providers found</p>
                                    ) : (
                                        filteredProviders.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => startDm(p)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                                            >
                                                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white ${avatarColor(p.fullName)}`}>
                                                    {nameInitials(p.fullName)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{p.fullName}</p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {p.professionalDetails?.specialty || p.title || "Provider"}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

/* ── Message List ── */
function MessageList({ groups, loading, currentUserId, currentUserIds = [], currentUserName = "" }: {
    groups: { date: string; items: MessageItem[] }[];
    loading: boolean;
    currentUserId: string;
    currentUserIds?: string[];
    currentUserName?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevCount = useRef(0);
    const total = groups.reduce((n, g) => n + g.items.length, 0);

    useEffect(() => {
        if (total > prevCount.current) {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
        prevCount.current = total;
    }, [total]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="px-1 py-3">
                {groups.map((g) => (
                    <div key={g.date}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 px-5 py-3">
                            <div className="h-px flex-1 bg-gray-200" />
                            <span className="text-xs font-medium text-gray-400 shrink-0">{g.date}</span>
                            <div className="h-px flex-1 bg-gray-200" />
                        </div>
                        {/* Messages */}
                        {g.items.map((m, idx) => {
                            const isFirst = idx === 0 || g.items[idx - 1].senderId !== m.senderId ||
                                (new Date(m.createdAt).getTime() - new Date(g.items[idx - 1].createdAt).getTime() > 300000);
                            return (
                                <MsgItem
                                    key={m.id}
                                    msg={m}
                                    isMe={currentUserIds.includes(m.senderId) || m.senderId === currentUserId || (!!currentUserName && m.senderName === currentUserName)}
                                    showHeader={isFirst}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Message Item ── */
function MsgItem({ msg, isMe, showHeader }: { msg: MessageItem; isMe: boolean; showHeader: boolean }) {
    if (msg.isSystem) {
        return (
            <div className="flex items-center gap-3 px-5 py-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">{msg.content}</span>
                <div className="h-px flex-1 bg-gray-200" />
            </div>
        );
    }

    if (msg.isDeleted) {
        return (
            <div className="px-5 py-1">
                <p className="text-xs italic text-gray-400">This message was deleted.</p>
            </div>
        );
    }

    const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const color = msg.senderAvatar?.color || avatarColor(msg.senderName);

    return (
        <div className={`group flex px-5 hover:bg-gray-50/80 transition-colors ${
            isMe ? "flex-row-reverse gap-2.5" : "flex-row gap-3"
        } ${showHeader ? "pt-3" : "pt-1"} pb-0.5`}>
            {/* Avatar */}
            <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${color}`}>
                {msg.senderAvatar?.initials || nameInitials(msg.senderName)}
            </div>
            {/* Content */}
            <div className={`max-w-[75%] min-w-0 ${isMe ? "flex flex-col items-end" : ""}`}>
                <div className={`flex items-center gap-2 mb-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className="text-sm font-semibold text-gray-900">{msg.senderName || "Unknown"}</span>
                    <span className="text-xs text-gray-400">{time}</span>
                    {msg.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                </div>
                <div className={`inline-block rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isMe
                        ? "bg-blue-500 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}>{msg.content}</div>

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                        {msg.attachments.map((a) => (
                            <button
                                key={a.id}
                                type="button"
                                onClick={async () => {
                                    try {
                                        const res = await fetchWithAuth(a.fileUrl);
                                        if (!res.ok) throw new Error("Download failed");
                                        const blob = await res.blob();
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = a.fileName;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                                    } catch {
                                        window.open(a.fileUrl, "_blank");
                                    }
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                <Paperclip className="h-3.5 w-3.5 text-gray-500" />
                                <span className="truncate max-w-[200px]">{a.fileName}</span>
                                <span className="text-xs text-gray-400">{formatBytes(a.fileSize)}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.reactions.map((r) => (
                            <span
                                key={r.emoji}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                                    r.hasReacted ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"
                                }`}
                            >
                                {r.emoji} {r.count}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Compose Bar ── */
function ComposeBar({ channelName, onSend }: { channelName: string; onSend: (content: string) => void }) {
    const [content, setContent] = useState("");
    const ref = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!content.trim()) return;
        onSend(content.trim());
        setContent("");
        if (ref.current) ref.current.style.height = "40px";
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleInput = () => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "40px";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
    };

    return (
        <div className="border-t border-gray-200 bg-white px-5 py-3 shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                <textarea
                    ref={ref}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKey}
                    onInput={handleInput}
                    placeholder={`Message ${channelName}...`}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none min-h-[40px] max-h-[160px] py-1.5"
                />
                <button
                    onClick={handleSend}
                    disabled={!content.trim()}
                    className={`shrink-0 p-2 rounded-lg transition-colors ${
                        content.trim()
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/* ───── utilities ───── */
function nameInitials(name: string) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
}

function avatarColor(name: string) {
    const colors = [
        "bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-amber-600",
        "bg-rose-600", "bg-cyan-600", "bg-indigo-600", "bg-teal-600",
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    return colors[Math.abs(h) % colors.length];
}

function relTime(iso: string) {
    const d = Date.now() - new Date(iso).getTime();
    if (d < 60000) return "now";
    if (d < 3600000) return `${Math.floor(d / 60000)}m`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
    return `${Math.floor(d / 86400000)}d`;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}
