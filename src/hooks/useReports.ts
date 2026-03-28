import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { safeStr } from "@/utils/safeStr";

export type ApiReport = {
  id: number | string;
  fhirId?: string;
  patientId: number;
  category: string;
  type: string;
  fileName: string;
  contentType: string;
  description?: string;
  encrypted: boolean;
  createdDate?: string;
  lastModifiedDate?: string;
  /** Lab result fields — reports are structured data, not downloadable files */
  [key: string]: any;
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
          if (data.success === false) { setReports([]); return; }
          const rawList = Array.isArray(data.data) ? data.data : (data.data?.content || []);
          const mapped = rawList.map((item: any) => {
            // Flatten: convert any nested FHIR objects (CodeableConcept etc.) to safe strings
            const flat = Object.fromEntries(
              Object.entries(item).map(([k, v]) => [k, typeof v === "object" && v !== null && !Array.isArray(v) ? safeStr(v) : v])
            );
            return {
              ...flat,
              id: item.id,
              fhirId: item.fhirId || item.id,
              patientId: item.patientId,
              category: safeStr(item.category || item.type, "Report"),
              type: safeStr(item.type, "report"),
              fileName: safeStr(item.fileName ?? item.filename ?? item.testName ?? item.name, "Report"),
              contentType: item.contentType ?? "",
              description: safeStr(item.description || item.conclusion || item.title),
              encrypted: item.encrypted ?? false,
              createdDate: item.createdDate || item.orderDate || item.issued || item.documentDate || item.effectiveDate || "",
              lastModifiedDate: item.lastModifiedDate || "",
            };
          });
          setReports(mapped);
        } else if (res.status === 403) {
          // Forbidden - set empty list and suppress error for UI continuity
          setReports([]);
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