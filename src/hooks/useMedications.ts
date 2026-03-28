import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import { safeStr } from '@/utils/safeStr';

type Medication = {
  id: number;
  patientId: number;
  encounterId?: number;
  medicationName: string;
  dosage?: string;
  instructions?: string;
  dateIssued: string;
  prescribingDoctor?: string;
  status: string;
  audit?: {
    createdDate: string | null;
    lastModifiedDate: string | null;
  };
};

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth('/api/fhir/medications/my');
      
      if (res.ok) {
        const data = await res.json();
        console.log('Medications API response:', data); // Debug log
        
        if (data.success && data.data) {
          const mapDate = (v: any): string | null => {
            if (!v) return null;
            if (Array.isArray(v)) {
              const [y, m, d, hh = 0, mm = 0, ss = 0, ns = 0] = v;
              const ms = Math.floor((ns || 0) / 1e6);
              return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, ms).toISOString();
            }
            if (typeof v === 'string') return v;
            return null;
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
            medicationName: safeStr(item.medicationName || item.medication || item.code, "Unknown Medication"),
            dosage: safeStr(item.dosage),
            instructions: safeStr(item.instructions),
            dateIssued: item.dateIssued,
            prescribingDoctor: safeStr(item.prescribingDoctor || item.prescriberName || item.prescriber),
            status: safeStr(item.status),
            audit: {
              createdDate: mapDate(item.audit?.createdDate),
              lastModifiedDate: mapDate(item.audit?.lastModifiedDate)
            }
          }));
          setMedications(mapped);
        } else {
          setMedications([]);
          if (data.message) {
            setError(data.message);
          }
        }
      } else if (res.status === 403) {
        // Portal users may not have access to EHR medications endpoint — treat as empty list (no error)
        console.log('Medications access denied for portal user - showing empty list');
        setMedications([]);
        setError(null); // suppress error so UI shows empty state
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Medications fetch failed:", res.status, errorData);
        setError(`HTTP ${res.status}: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      console.error("Medications error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Network or auth error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { medications, loading, error, refetch: fetchMedications };
}