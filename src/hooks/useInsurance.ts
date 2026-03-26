import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { safeStr } from "@/utils/safeStr";

/* -------------------------------------------------------------------------- */
/*                        FULL Insurance Coverage Typing                      */
/* -------------------------------------------------------------------------- */
/* This includes ALL fields from backend: CoverageDto + Subscriber + Byholder +
   InsuranceCompanyDto (full details). All fields are optional to match
   real-world API flexibility.                                               */
/* -------------------------------------------------------------------------- */

export type InsuranceCompany = {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  payerId?: string;
  country?: string;
  fhirId?: string;
  status?: string;
};

export type InsuranceCoverage = {
  // Core Coverage
  id: number;
  externalId?: string;
  coverageType: string;
  planName: string;
  policyNumber: string;
  coverageStartDate: string;
  coverageEndDate: string;
  patientId?: number;
  provider?: string;
  effectiveDate?: string;
  effectiveDateEnd?: string;
  groupNumber?: string;
  copayAmount?: number;

  /* ---------------------------- Subscriber Fields -------------------------- */
  subscriberEmployer?: string;
  subscriberAddressLine1?: string;
  subscriberAddressLine2?: string;
  subscriberCity?: string;
  subscriberState?: string;
  subscriberZipCode?: string;
  subscriberCountry?: string;
  subscriberPhone?: string;

  /* --------------------------- Policyholder Fields ------------------------- */
  byholderName?: string;
  byholderRelation?: string;
  byholderAddressLine1?: string;
  byholderAddressLine2?: string;
  byholderCity?: string;
  byholderState?: string;
  byholderZipCode?: string;
  byholderCountry?: string;
  byholderPhone?: string;

  /* ------------------------ Embedded Company Object ------------------------ */
  insuranceCompany: InsuranceCompany;
};

/* -------------------------------------------------------------------------- */
/*                          Main Insurance Hook Logic                         */
/* -------------------------------------------------------------------------- */

export function useInsurance() {
  const [coverages, setCoverages] = useState<InsuranceCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Load insurance coverage for the current logged-in patient */
  const loadInsurance = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithAuth("/api/fhir/insurance/my");

      if (res.ok) {
        const data = await res.json();

        // Debug log — useful for verifying if backend is returning subscriber/byholder data
        console.debug("[useInsurance] raw API response:", data);

        if (data.success && data.data) {
          // data.data may be a paginated wrapper { content: [...], ... } or a plain array
          const raw = data.data;
          const rawList = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.content)
            ? raw.content
            : [];
          // Normalize field names from backend variations
          const coverageList = rawList.map((item: any) => {
            // Flatten any nested FHIR objects to safe strings
            const flat = Object.fromEntries(
              Object.entries(item).map(([k, v]) => [k, typeof v === "object" && v !== null && !Array.isArray(v) ? safeStr(v) : v])
            );
            return {
              ...flat,
              coverageStartDate: item.coverageStartDate || item.effectiveDate || item.startDate || item.coverageStart || "",
              coverageEndDate: item.coverageEndDate || item.effectiveDateEnd || item.endDate || item.coverageEnd || item.expirationDate || "",
            };
          });
          setCoverages(coverageList);
        } else {
          setCoverages([]);
          if (data.message) setError(data.message);
        }
      } else if (res.status === 403) {
        // Forbidden — Just empty the list (UI continuity)
        setCoverages([]);
      } else {
        // HTTP other errors
        const errorData = await res.json().catch(() => ({}));
        console.error("Insurance fetch failed:", res.status, errorData);
        setError(`HTTP ${res.status}: ${errorData.message || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Insurance error:", e);
      const errorMessage =
        e instanceof Error ? e.message : "Network or authentication error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* Fetch on mount */
  useEffect(() => {
    loadInsurance();
  }, []);

  return { coverages, loading, error, refetch: loadInsurance };
}
