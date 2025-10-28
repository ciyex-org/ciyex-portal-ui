import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export type InsuranceCoverage = {
  id: number;
  coverageType: string;
  planName: string;
  policyNumber: string;
  groupNumber: string;
  coverageStartDate: string;
  coverageEndDate: string;
  copayAmount: number;
  insuranceCompany: {
    id: number;
    name: string;
  };
};

export function useInsurance() {
  const [coverages, setCoverages] = useState<InsuranceCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsurance = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth("/api/fhir/insurance/my");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCoverages(data.data);
        } else {
          setCoverages([]);
          if (data.message) {
            setError(data.message);
          }
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Insurance fetch failed:", res.status, errorData);
        setError(`HTTP ${res.status}: ${errorData.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error("Insurance error:", e);
      const errorMessage = e instanceof Error ? e.message : 'Network or auth error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsurance();
  }, []);

  return { coverages, loading, error, refetch: loadInsurance };
}