import { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

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
        const rawList = Array.isArray(data.data) ? data.data : (data.data?.content || []);
        const mapped = rawList.map((item: any) => ({
          id: item.id,
          fhirId: item.fhirId ?? item.fhir_id ?? undefined,
          patientId: item.patientId ?? item.patientid,
          category: item.category || 'Medical Records',
          type: item.type,
          fileName: item.fileName ?? item.filename ?? item.name ?? 'Document',
          contentType: item.contentType ?? item.contenttype ?? '',
          description: item.description || item.title,
          encrypted: item.encrypted ?? !!(item.encryptionkey || item.encryptionKey),
          archived: item.archived || item.status === 'ARCHIVED' || false,
          createdDate: item.documentDate ?? item.createdDate ?? item.created_date ?? item.uploadDate ?? '',
          lastModifiedDate: item.lastModifiedDate ?? item.last_modified_date ?? '',
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
    try {
      const doc = documents.find(d => d.id === docId);
      const lookupId = doc?.fhirId || docId;
      const res = await fetchWithAuth(`/api/fhir/portal/documents/${lookupId}/download`);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
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
    } catch (e) {
      console.error("Download error:", e);
      return false;
    }
  };

  const viewDocument = async (docId: number): Promise<string | null> => {
    try {
      const doc = documents.find(d => d.id === docId);
      const lookupId = doc?.fhirId || docId;
      const res = await fetchWithAuth(`/api/fhir/portal/documents/${lookupId}/download`);
      if (!res.ok) {
        const errorMsg = res.status === 404
          ? "Document not found. It may have been removed or is not yet available."
          : `Failed to load document (HTTP ${res.status})`;
        throw new Error(errorMsg);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      return url;
    } catch (e) {
      console.error("View error:", e);
      const message = e instanceof Error ? e.message : "Could not open document. Please try again later.";
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
      return null;
    }
  };

  const deleteDocument = async (docId: number) => {
    try {
      const doc = documents.find(d => d.id === docId);
      const lookupId = doc?.fhirId || docId;
      const res = await fetchWithAuth(`/api/fhir/portal/documents/${lookupId}`, {
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
        const archiveDoc = documents.find(d => d.id === docId);
        const archiveLookupId = archiveDoc?.fhirId || docId;
        const res = await fetchWithAuth(`/api/fhir/portal/documents/${archiveLookupId}`, { method: 'DELETE' });
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