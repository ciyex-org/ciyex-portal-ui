import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export type ApiReport = {
  id: number;
  patientId: number;
  category: string;
  type: string;
  fileName: string;
  contentType: string;
  description?: string;
  encrypted: boolean;
  createdDate?: string;
  lastModifiedDate?: string;
};

export function useReports() {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const res = await fetchWithAuth("/api/fhir/portal/reports/my");
        if (res.ok) {
          const data = await res.json();
          setReports(data.data || []);
        } else {
          console.error("Reports fetch failed:", res.status);
          setError(`HTTP ${res.status}`);
        }
      } catch (e) {
        console.error("Reports error:", e);
        setError("Network or auth error");
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  return { reports, loading, error };
}