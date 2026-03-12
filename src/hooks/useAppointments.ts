import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export type ApiAppointment = {
  id: number;
  patientId: number;
  providerId: number;
  locationId?: number;
  appointmentType: string;
  status: string; // scheduled|confirmed|cancelled|completed|no-show
  scheduledDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes?: string;
  reason?: string;
  createdDate?: string;
  lastModifiedDate?: string;
};

export function useAppointments() {
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const res = await fetchWithAuth("/api/portal/appointments");
        if (res.ok) {
          const data = await res.json();
          const rawData = data.data ?? data;
          const list = Array.isArray(rawData) ? rawData : (rawData?.content || []);
          setAppointments(list);
        } else if (res.status === 403) {
          // Forbidden - set empty list and suppress error for UI continuity
          setAppointments([]);
        } else {
          console.error("Appointments fetch failed:", res.status);
          setError(`HTTP ${res.status}`);
        }
      } catch (e) {
        console.error("Appointments error:", e);
        setError("Network or auth error");
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, []);

  return { appointments, loading, error };
}