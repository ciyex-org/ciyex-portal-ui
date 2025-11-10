/* eslint-disable @typescript-eslint/no-explicit-any */
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
      const res = await fetchWithAuth(`/api/fhir/portal/documents/${docId}/view`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.viewUrl; // Should return a temporary URL to view the document
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

  useEffect(() => {
    loadDocuments();
  }, []);

  return { documents, loading, error, downloadDocument, viewDocument, deleteDocument };
}