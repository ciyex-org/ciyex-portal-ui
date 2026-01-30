"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import Alert from "@/components/ui/alert/Alert";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type Allergy = {
  id: number;
  substance: string;
  reaction: string;
  severity: "Mild" | "Moderate" | "Severe";
};

type HistoryItem = {
  id: number;
  type: "Condition" | "Surgery" | "Family";
  description: string;
  year?: string;
};

export default function AllergiesPage() {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [alert, setAlert] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);

  // Auto-dismiss alerts
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Load initial data
  useEffect(() => {
    loadAllergies();
    loadHistory();
  }, []);

  async function loadAllergies() {
    try {
      const res = await fetchWithAuth("/api/portal/allergies");
      const data = await res.json();
      const mapped = (data.data || []).map((item: any) => ({
        id: item.id,
        substance: item.allergy_name || item.substance,
        reaction: item.reaction,
        severity: item.severity
      }));
      setAllergies(mapped);
    } catch (error) {
      console.error("Failed to load allergies:", error);
      setAlert({ variant: "error", title: "Error", message: "Failed to load allergies." });
    }
  }

  async function loadHistory() {
    try {
      const res = await fetchWithAuth("/api/portal/history");
      const data = await res.json();
      const mapped = (data.data || []).map((item: any) => ({
        id: item.id,
        type: item.history_type || 'Condition',
        description: item.medical_condition ? `${item.medical_condition} ${item.description}` : item.description,
        year: item.date_occurred || item.onset_date ? new Date(item.date_occurred || item.onset_date).getFullYear().toString() : ''
      }));
      setHistory(mapped);
    } catch (error) {
      console.error("Failed to load history:", error);
      setAlert({ variant: "error", title: "Error", message: "Failed to load history." });
    }
  }

  function handleAddAllergy() {
    setAllergies((prev) => [...prev, { id: Date.now(), substance: "", reaction: "", severity: "Mild" }]);
  }

  function handleAddHistory() {
    setHistory((prev) => [...prev, { id: Date.now(), type: "Condition", description: "", year: "" }]);
  }

  async function handleSave() {
    try {
      await fetchWithAuth("/api/portal/allergies", {
        method: "POST",
        body: JSON.stringify(allergies),
      });
      await fetchWithAuth("/api/portal/history", {
        method: "POST",
        body: JSON.stringify(history),
      });
      setEditMode(false);
      setAlert({ variant: "success", title: "Saved", message: "Allergies and history updated successfully." });
    } catch {
      setAlert({ variant: "error", title: "Error", message: "Failed to save changes." });
    }
  }

  return (
    <AdminLayout>
      {/* Clinical Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Health Profile</h1>
              <p className="text-slate-600 mt-1">Manage your allergies and medical history</p>
            </div>
            <div className="flex items-center space-x-3">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {alert && (
          <div className="mb-6">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Allergies Section */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Allergies</h2>
                  <p className="text-sm text-slate-600">Known allergic reactions</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {allergies.length > 0 ? (
                <div className="space-y-4">
                  {allergies.map((allergy) => (
                    <div key={allergy.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-slate-900">{allergy.substance || "Unknown Substance"}</h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              allergy.severity === "Severe" ? "bg-red-100 text-red-800" :
                              allergy.severity === "Moderate" ? "bg-yellow-100 text-yellow-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {allergy.severity}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Reaction:</span> {allergy.reaction || "Not specified"}
                          </p>
                        </div>
                        {editMode && (
                          <button
                            onClick={() => setAllergies(prev => prev.filter(a => a.id !== allergy.id))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {editMode && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                          <input
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Substance (e.g., Peanuts)"
                            value={allergy.substance}
                            onChange={(e) =>
                              setAllergies((prev) => prev.map((a) => (a.id === allergy.id ? { ...a, substance: e.target.value } : a)))
                            }
                          />
                          <input
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Reaction (e.g., Hives, swelling)"
                            value={allergy.reaction}
                            onChange={(e) =>
                              setAllergies((prev) => prev.map((a) => (a.id === allergy.id ? { ...a, reaction: e.target.value } : a)))
                            }
                          />
                          <select
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={allergy.severity}
                            onChange={(e) =>
                              setAllergies((prev) =>
                                prev.map((a) => (a.id === allergy.id ? { ...a, severity: e.target.value as Allergy["severity"] } : a))
                              )
                            }
                          >
                            <option value="Mild">Mild</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Severe">Severe</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 mb-1">No allergies recorded</h3>
                  <p className="text-xs text-slate-500">Add allergies in edit mode to keep your healthcare providers informed.</p>
                </div>
              )}
              {editMode && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleAddAllergy}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center justify-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Allergy
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Medical History Section */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Medical History</h2>
                  <p className="text-sm text-slate-600">Past conditions and procedures</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.type === "Condition" ? "bg-blue-100 text-blue-800" :
                              item.type === "Surgery" ? "bg-red-100 text-red-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {item.type}
                            </span>
                            {item.year && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {item.year}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">{item.description || "No description provided"}</p>
                        </div>
                        {editMode && (
                          <button
                            onClick={() => setHistory(prev => prev.filter(h => h.id !== item.id))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {editMode && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                          <select
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={item.type}
                            onChange={(e) =>
                              setHistory((prev) =>
                                prev.map((h) => (h.id === item.id ? { ...h, type: e.target.value as HistoryItem["type"] } : h))
                              )
                            }
                          >
                            <option value="Condition">Condition</option>
                            <option value="Surgery">Surgery</option>
                            <option value="Family">Family History</option>
                          </select>
                          <input
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description (e.g., Type 2 Diabetes)"
                            value={item.description}
                            onChange={(e) =>
                              setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, description: e.target.value } : h)))
                            }
                          />
                          <input
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Year (optional)"
                            value={item.year || ""}
                            onChange={(e) =>
                              setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, year: e.target.value } : h)))
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 mb-1">No medical history recorded</h3>
                  <p className="text-xs text-slate-500">Add medical history in edit mode to provide complete health information.</p>
                </div>
              )}
              {editMode && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleAddHistory}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center justify-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add History Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Important Health Information</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>Please keep this information up to date. Accurate allergy and medical history information helps your healthcare providers deliver the best possible care.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
