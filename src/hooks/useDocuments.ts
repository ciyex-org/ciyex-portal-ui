import { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/** Return the value only if it looks like a parseable date, otherwise empty string */
function toDateOrEmpty(v: any): string {
  if (!v || typeof v !== 'string') return '';
  // Skip values that are clearly status strings, not dates
  const dt = new Date(v);
  if (isNaN(dt.getTime())) return '';
  // Additional guard: reject strings that are single words (status values like "progress", "active")
  if (/^[a-zA-Z]+$/.test(v.trim())) return '';
  return v;
}

export type ApiDocument = {
  id: number;
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
  archived?: boolean;
};

export function useDocuments() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/fhir/portal/documents/my");
      if (res.ok) {
        const data = await res.json();
        // Handle success:false responses (patient not linked, etc.)
        if (data.success === false) {
          setDocuments([]);
          return;
        }
        const rawList = Array.isArray(data.data) ? data.data : (data.data?.content || []);
        const mapped = rawList.map((item: any) => ({
          id: item.id,
          fhirId: item.fhirId || item.fhir_id,
          patientId: item.patientId ?? item.patientid,
          category: item.category || 'Medical Records',
          type: item.type,
          fileName: item.fileName ?? item.filename ?? item.name ?? 'Document',
          contentType: item.contentType ?? item.contenttype ?? '',
          description: item.description || item.title,
          encrypted: item.encrypted ?? !!(item.encryptionkey || item.encryptionKey),
          archived: item.archived || item.status === 'ARCHIVED' || false,
          createdDate: toDateOrEmpty(item.documentDate) || toDateOrEmpty(item.createdDate) || toDateOrEmpty(item.created_date) || toDateOrEmpty(item.uploadDate) || toDateOrEmpty(item.date) || '',
          lastModifiedDate: toDateOrEmpty(item.lastModifiedDate) || toDateOrEmpty(item.last_modified_date) || '',
        }));
        setDocuments(mapped);
      } else if (res.status === 403) {
        setDocuments([]);
      } else {
        // Gracefully handle errors - show empty state instead of error
        console.error("Documents fetch failed:", res.status);
        setDocuments([]);
      }
    } catch (e) {
      console.error("Documents error:", e);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Build a list of IDs to try for download/view.
   * Prioritize fhirId (needed for actual file retrieval) over numeric DB id.
   */
  const getDocumentIds = (docId: number): string[] => {
    const doc = documents.find(d => d.id === docId);
    const ids: string[] = [];
    // fhirId first — backend download uses fhirId to locate the actual file
    if (doc?.fhirId) ids.push(String(doc.fhirId));
    // Then the numeric id as fallback
    if (!ids.includes(String(docId))) ids.push(String(docId));
    return ids;
  };

  const downloadDocument = async (docId: number) => {
    const doc = documents.find(d => d.id === docId);
    const ids = getDocumentIds(docId);

    for (const id of ids) {
      try {
        const res = await fetchWithAuth(`/api/fhir/portal/documents/${id}/download`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc?.fileName || 'document';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return true;
        }
      } catch {
        // try next id
      }
    }

    if (typeof window !== 'undefined') {
      window.alert("Failed to download document. The file may not be available yet.");
    }
    return false;
  };

  const viewDocument = async (docId: number): Promise<string | null> => {
    const ids = getDocumentIds(docId);

    for (const id of ids) {
      try {
        const res = await fetchWithAuth(`/api/fhir/portal/documents/${id}/download`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
          return url;
        }
      } catch {
        // try next id
      }
    }

    if (typeof window !== 'undefined') {
      window.alert("Document not found or not available. Please contact your provider.");
    }
    return null;
  };

  const deleteDocument = async (docId: number) => {
    try {
      const res = await fetchWithAuth(`/api/fhir/portal/documents/${docId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      // Update local state after successful deletion
      setDocuments(prev => prev.filter(d => d.id !== docId));
      return true;
    } catch (e) {
      console.error("Delete error:", e);
      return false;
    }
  };

  const archiveDocument = async (docId: number) => {
    try {
      // Try portal delete/archive endpoint first
      // Call portal endpoint with DELETE if present — but never perform hard delete locally.
      try {
        const res = await fetchWithAuth(`/api/fhir/portal/documents/${docId}`, { method: 'DELETE' });
        if (res.ok) {
          setDocuments(prev => prev.map(d => d.id === docId ? { ...d, archived: true } : d));
          return true;
        }
      } catch {
        // ignore network errors for archive call; we'll still mark locally
      }

      // If the portal endpoint isn't present or failed, mark archived locally only
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, archived: true } : d));
      return true;
    } catch (e) {
      console.error('Archive error:', e);
      return false;
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return { documents, loading, error, downloadDocument, viewDocument, deleteDocument, archiveDocument };
}