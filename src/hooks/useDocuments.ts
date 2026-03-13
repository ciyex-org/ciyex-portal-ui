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
        const rawList = Array.isArray(data.data) ? data.data : (data.data?.content || []);
        const mapped = rawList.map((item: any) => ({
          id: item.id,
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
        // Forbidden - set empty list and suppress error for UI continuity
        setDocuments([]);
      } else {
        console.error("Documents fetch failed:", res.status);
        setError(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Documents error:", e);
      setError("Network or auth error");
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadDocument = async (docId: number) => {
    const paths = [
      `/api/fhir/portal/documents/${docId}/download`,
      `/api/portal/documents/${docId}/download`,
      `/api/documents/${docId}/download`,
      `/api/fhir/documents/${docId}/download`,
    ];

    for (const path of paths) {
      try {
        const res = await fetchWithAuth(path);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = documents.find(d => d.id === docId)?.fileName || 'document';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return true;
        }
        // Keep trying on 404, 500, 403 — another path may work
        if (res.status !== 404 && res.status !== 500 && res.status !== 403) break;
      } catch {
        // try next path
      }
    }

    if (typeof window !== 'undefined') {
      window.alert("Failed to download document. The file may not be available yet.");
    }
    return false;
  };

  const viewDocument = async (docId: number): Promise<string | null> => {
    // Try multiple endpoint paths — backend may serve at different locations
    const paths = [
      `/api/fhir/portal/documents/${docId}/download`,
      `/api/portal/documents/${docId}/download`,
      `/api/documents/${docId}/download`,
      `/api/fhir/documents/${docId}/download`,
    ];

    for (const path of paths) {
      try {
        const res = await fetchWithAuth(path);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
          return url;
        }
        // Keep trying on 404, 500, 403 — another path may work
        if (res.status !== 404 && res.status !== 500 && res.status !== 403) {
          const errorMsg = `Failed to load document (HTTP ${res.status})`;
          if (typeof window !== 'undefined') window.alert(errorMsg);
          return null;
        }
      } catch {
        // Network error — try next path
      }
    }

    // All paths failed
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