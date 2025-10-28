"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import Alert from "@/components/ui/alert/Alert";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Button from "@/components/ui//button/Button";

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
      setAllergies(data.data || []);
    } catch {
      setAlert({ variant: "error", title: "Error", message: "Failed to load allergies." });
    }
  }

  async function loadHistory() {
    try {
      const res = await fetchWithAuth("/api/portal/history");
      const data = await res.json();
      setHistory(data.data || []);
    } catch {
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
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Allergies & History</h1>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Edit</Button>
          ) : (
            <div className="space-x-2">
              <Button onClick={handleSave} variant="primary">Save</Button>
              <Button onClick={() => setEditMode(false)} variant="outline">Cancel</Button>
            </div>
          )}
        </div>

        {/* alerts */}
        {alert && <Alert variant={alert.variant} title={alert.title} message={alert.message} />}

        {/* Allergies section */}
        <section>
          <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-3">Allergies</h2>
          <div className="space-y-3">
            {allergies.map((a) =>
              !editMode ? (
                <div key={a.id} className="p-3 border rounded bg-white dark:bg-gray-800 flex justify-between">
                  <div>
                    <p className="font-medium">{a.substance}</p>
                    <p className="text-sm text-gray-500">Reaction: {a.reaction || "—"}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      a.severity === "Severe"
                        ? "bg-red-100 text-red-800"
                        : a.severity === "Moderate"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {a.severity}
                  </span>
                </div>
              ) : (
                <div key={a.id} className="p-3 border rounded bg-gray-50 dark:bg-gray-700 space-y-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Substance"
                    value={a.substance}
                    onChange={(e) =>
                      setAllergies((prev) => prev.map((x) => (x.id === a.id ? { ...x, substance: e.target.value } : x)))
                    }
                  />
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Reaction"
                    value={a.reaction}
                    onChange={(e) =>
                      setAllergies((prev) => prev.map((x) => (x.id === a.id ? { ...x, reaction: e.target.value } : x)))
                    }
                  />
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={a.severity}
                    onChange={(e) =>
                      setAllergies((prev) =>
                        prev.map((x) => (x.id === a.id ? { ...x, severity: e.target.value as Allergy["severity"] } : x))
                      )
                    }
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
              )
            )}
            {editMode && (
              <Button onClick={handleAddAllergy} variant="outline">+ Add Allergy</Button>
            )}
          </div>
        </section>

        {/* Medical History section */}
        <section>
          <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-3">Medical History</h2>
          <div className="space-y-3">
            {history.map((h) =>
              !editMode ? (
                <div key={h.id} className="p-3 border rounded bg-white dark:bg-gray-800">
                  <p className="font-medium">{h.type}: {h.description}</p>
                  {h.year && <p className="text-sm text-gray-500">Year: {h.year}</p>}
                </div>
              ) : (
                <div key={h.id} className="p-3 border rounded bg-gray-50 dark:bg-gray-700 space-y-2">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={h.type}
                    onChange={(e) =>
                      setHistory((prev) =>
                        prev.map((x) => (x.id === h.id ? { ...x, type: e.target.value as HistoryItem["type"] } : x))
                      )
                    }
                  >
                    <option value="Condition">Condition</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Family">Family</option>
                  </select>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Description"
                    value={h.description}
                    onChange={(e) =>
                      setHistory((prev) => prev.map((x) => (x.id === h.id ? { ...x, description: e.target.value } : x)))
                    }
                  />
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Year"
                    value={h.year || ""}
                    onChange={(e) =>
                      setHistory((prev) => prev.map((x) => (x.id === h.id ? { ...x, year: e.target.value } : x)))
                    }
                  />
                </div>
              )
            )}
            {editMode && (
              <Button onClick={handleAddHistory} variant="outline">+ Add History</Button>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
