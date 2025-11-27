import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

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

  const loadDocuments = async () => {
    try {
      const res = await fetchWithAuth("/api/fhir/portal/documents/my");
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.data || []).map((item: any) => ({
          id: item.id,
          patientId: item.patientid,
          category: item.category || 'Medical Records',
          type: item.type,
          fileName: item.filename,
          contentType: item.contenttype,
          description: item.description,
          encrypted: !!item.encryptionkey,
          archived: item.archived || item.status === 'ARCHIVED' || false,
          createdDate: item.created_date,
          lastModifiedDate: item.last_modified_date
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
  };

  const downloadDocument = async (docId: number) => {
    try {
      const res = await fetchWithAuth(`/api/fhir/portal/documents/${docId}/download`);
      
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

  const viewDocument = async (docId: number) => {
    try {
      // The portal provides a download endpoint; fetch it as a blob and open in a new tab
      const res = await fetchWithAuth(`/api/fhir/portal/documents/${docId}/download`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      // Open in new tab (browser will render PDFs/images if supported)
      window.open(url, '_blank');
      // Revoke after a short timeout to allow the new tab to load
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      return url;
    } catch (e) {
      console.error("View error:", e);
      return null;
    }
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
  }, []);

  return { documents, loading, error, downloadDocument, viewDocument, deleteDocument, archiveDocument };
}