import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export type ApiVital = {
  id: number;
  patientId?: number;
  encounterId?: number | null;
  weightKg?: number;
  weightLbs?: number;
  heightCm?: number | null;
  heightIn?: number | null;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  respiration?: number | null;
  temperatureC?: number;
  temperatureF?: number;
  oxygenSaturation?: number;
  bmi?: number;
  notes?: string;
  signed?: boolean | null;
  recordedAt?: string;
  createdDate?: string;
  lastModifiedDate?: string;
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
          const toIso = (v: any): string | undefined => {
            if (!v) return undefined;
            if (Array.isArray(v)) {
              // v can be [year, month, day, hour, minute] or with seconds and nanos
              const [y, m, d, hh = 0, mm = 0, ss = 0, ns = 0] = v;
              const ms = Math.floor((ns || 0) / 1e6);
              // Construct a Date in local timezone using the components
              return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, ms).toISOString();
            }
            if (typeof v === "string") return v;
            return undefined;
          };

          // data.data may be a paginated wrapper { content: [...], ... } or a plain array
          const rawData = data.data;
          const itemList: any[] = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData?.content)
            ? rawData.content
            : [];
          const mapped = itemList.map((item: any) => ({
            id: item.id,
            patientId: item.patientId,
            encounterId: item.encounterId ?? null,
            weightKg: item.weightKg,
            weightLbs: item.weightLbs,
            heightCm: item.heightCm ?? null,
            heightIn: item.heightIn ?? null,
            bpSystolic: item.bpSystolic,
            bpDiastolic: item.bpDiastolic,
            pulse: item.pulse,
            respiration: item.respiration ?? null,
            temperatureC: item.temperatureC,
            temperatureF: item.temperatureF,
            oxygenSaturation: item.oxygenSaturation,
            bmi: item.bmi,
            notes: item.notes,
            signed: item.signed ?? null,
            recordedAt: toIso(item.recordedAt),
            createdDate: toIso(item.createdDate),
            lastModifiedDate: toIso(item.lastModifiedDate),
          }));
          setVitals(mapped);
        } else if (res.status === 403) {
          // Forbidden - set empty list and suppress error for UI continuity
          setVitals([]);
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