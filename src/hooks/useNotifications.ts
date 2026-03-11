import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

export type Notification = {
  id: number;
  type: 'message' | 'appointment' | 'lab' | 'billing' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  fromUser?: string;
  avatar?: string;
};

type CommunicationDto = {
  id: number;
  subject: string;
  payload: string;
  status: string;
  fromName?: string;
  toNames?: string[];
  createdDate?: string;
  fromType?: 'provider' | 'patient';
  readAt?: string;
  readBy?: string;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const allNotifications: Notification[] = [];
      
      // Load messages
      const messagesRes = await fetchWithAuth("/api/portal/communications/my");
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        const msgList = Array.isArray(data.data) ? data.data : (data.data?.content || []);
        if (msgList.length > 0) {
          const messageNotifications = msgList.map((comm: CommunicationDto) => ({
            id: comm.id,
            type: 'message' as const,
            title: `New message from ${comm.fromName || 'Provider'}`,
            message: comm.payload || 'No content',
            isRead: !!comm.readAt,
            createdAt: comm.createdDate || new Date().toISOString(),
            actionUrl: '/messages',
            fromUser: comm.fromName
          }));
          allNotifications.push(...messageNotifications);
        }
      }
      
      // Load appointments (upcoming)
      const appointmentsRes = await fetchWithAuth("/api/portal/appointments");
      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json();
        const apptList = Array.isArray(data.data) ? data.data : (data.data?.content || []);
        if (apptList.length > 0) {
          const upcoming = apptList.filter((apt: any) => {
            const dt = apt.appointmentDateTime || apt.appointmentStartDate || apt.start;
            return dt && new Date(dt) > new Date();
          });
          const appointmentNotifications = upcoming.slice(0, 3).map((apt: any, index: number) => ({
            id: `apt-${apt.id}`,
            type: 'appointment' as const,
            title: 'Upcoming Appointment',
            message: `${apt.appointmentType} with ${apt.providerName}`,
            isRead: true, // Appointments are informational
            createdAt: apt.appointmentDateTime,
            actionUrl: '/appointments'
          }));
          allNotifications.push(...appointmentNotifications);
        }
      }
      
      // Sort by date (newest first)
      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      // Mark as read in backend (you'll need to implement this endpoint)
      // For now, just update locally
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      // Mark all as read in backend (you'll need to implement this endpoint)
      // For now, just update locally
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications
  };
}