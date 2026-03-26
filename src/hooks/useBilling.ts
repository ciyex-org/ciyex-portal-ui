import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { safeStr } from "@/utils/safeStr";

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
          // data.data may be a paginated wrapper { content: [...], ... } or a plain array
          const raw = data.data;
          const rawList: any[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.content)
            ? raw.content
            : [];
          // Normalize FHIR Claim fields to ApiInvoice fields
          const invoiceList: ApiInvoice[] = rawList.map((item: any) => {
            // Flatten nested FHIR objects to safe strings
            const flat: Record<string, any> = {};
            for (const [k, v] of Object.entries(item)) {
              flat[k] = typeof v === "object" && v !== null && !Array.isArray(v) ? safeStr(v) : v;
            }
            return {
              ...flat,
              id: item.id,
              orgId: item.orgId,
              patientId: item.patientId,
              status: safeStr(item.status, "draft"),
              invoiceNumber: item.invoiceNumber ?? (item.id ? `CLM-${item.id}` : undefined),
              issueDate: item.issueDate ?? item.serviceDate,
              totalGross: item.totalGross ?? (item.amount != null ? String(item.amount) : undefined),
              payer: safeStr(item.payer ?? item.providerDisplay),
              notes: safeStr(item.notes ?? item.description),
              currency: item.currency ?? 'USD',
            } as ApiInvoice;
          });
          setInvoices(invoiceList);
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