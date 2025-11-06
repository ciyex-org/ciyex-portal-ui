import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export type ApiInvoice = {
  id: number;
  externalId?: string;
  orgId: number;
  patientId: number;
  encounterId?: number;
  invoiceNumber?: string;
  status: string; // draft|issued|balanced|cancelled|entered-in-error
  currency: string;
  issueDate?: string;
  dueDate?: string;
  payer?: string;
  notes?: string;
  totalGross?: string;
  totalNet?: string;
  lines?: Array<{
    id?: number;
    description?: string;
    quantity?: number;
    unitPrice?: string;
    amount?: string;
    code?: string;
  }>;
  payments?: Array<{
    id?: number;
    date?: string;
    amount?: string;
    method?: string;
    reference?: string;
    note?: string;
  }>;
  audit?: {
    createdDate?: string;
    lastModifiedDate?: string;
  };
};

export function useBilling() {
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const res = await fetchWithAuth("/api/fhir/portal/billing/my");
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.data || []);
        } else if (res.status === 403) {
          // Forbidden - set empty list and suppress error for UI continuity
          setInvoices([]);
        } else {
          console.error("Billing fetch failed:", res.status);
          setError(`HTTP ${res.status}`);
        }
      } catch (e) {
        console.error("Billing error:", e);
        setError("Network or auth error");
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, []);

  return { invoices, loading, error };
}