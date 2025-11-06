import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

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
    createdDate: string;
    lastModifiedDate: string;
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
          setMedications(data.data);
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