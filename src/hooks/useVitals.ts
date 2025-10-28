import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export type ApiVital = {
  notes: string;
  bmi: number | null;
  id: number;
  recordedAt?: string;
  createdDate?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperatureF?: number;
  temperatureC?: number;
  weightLbs?: number;
  weightKg?: number;
  oxygenSaturation?: number;
};

export function useVitals() {
  const [vitals, setVitals] = useState<ApiVital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVitals = async () => {
      try {
        const res = await fetchWithAuth("/api/fhir/vitals/my");
        if (res.ok) {
          const data = await res.json();
          setVitals(data.data || []);
        } else {
          console.error("Vitals fetch failed:", res.status);
          setError(`HTTP ${res.status}`);
        }
      } catch (e) {
        console.error("Vitals error:", e);
        setError("Network or auth error");
      } finally {
        setLoading(false);
      }
    };
    loadVitals();
  }, []);

  return { vitals, loading, error };
}