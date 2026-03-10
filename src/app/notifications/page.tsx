"use client";

import AdminLayout from "@/app/(admin)/layout";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, CheckCheck, AlertCircle } from "lucide-react";

function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNotificationIcon(type: string) {
    switch (type) {
        case "message": return "💬";
        case "appointment": return "📅";
        case "lab": return "🧪";
        case "billing": return "💳";
        default: return "🔔";
    }
}

export default function NotificationsPage() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <CheckCheck className="h-4 w-4" /> Mark all read
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-16">
                        <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No notifications</h3>
                        <p className="text-sm text-gray-500 mt-1">You&apos;re all caught up! Notifications will appear here.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => {
                                    if (!notification.isRead) markAsRead(notification.id);
                                    if (notification.actionUrl) window.location.href = notification.actionUrl;
                                }}
                                className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                    !notification.isRead ? "bg-blue-50/50" : ""
                                }`}
                            >
                                <span className="text-2xl shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                        {notification.title}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                                        <span className="capitalize">{notification.type}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                        <span>{formatTime(notification.createdAt)}</span>
                                    </div>
                                </div>
                                {!notification.isRead && (
                                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 mt-2" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
