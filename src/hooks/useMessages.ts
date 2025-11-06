import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export type ApiMessage = {
  id: number;
  patientId: number;
  senderId: number;
  recipientId: number;
  subject: string;
  message: string;
  status: string; // unread|read|archived
  priority: string; // low|normal|high|urgent
  category?: string;
  createdDate?: string;
  lastModifiedDate?: string;
};

export function useMessages() {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetchWithAuth("/api/portal/messages/my");
        if (res.ok) {
          const data = await res.json();
          setMessages(data.data || []);
        } else if (res.status === 403) {
          // Forbidden - set empty list and suppress error for UI continuity
          setMessages([]);
        } else {
          console.error("Messages fetch failed:", res.status);
          setError(`HTTP ${res.status}`);
        }
      } catch (e) {
        console.error("Messages error:", e);
        setError("Network or auth error");
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, []);

  return { messages, loading, error };
}