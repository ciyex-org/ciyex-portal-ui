"use client";

import { useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import Alert from "@/components/ui/alert/Alert";

type LabOrder = {
  id: number;
  testName: string;
  orderedDate: string;
  status: "Pending" | "Completed";
  result?: string;
  details?: string; // extended result details
};

export default function LabsPage() {
  const [labs, setLabs] = useState<LabOrder[]>([
    {
      id: 1,
      testName: "Complete Blood Count (CBC)",
      orderedDate: "2025-09-01",
      status: "Completed",
      result: "Normal",
      details:
        "WBC: 6.2 x10^9/L\nRBC: 4.8 x10^12/L\nHemoglobin: 14.5 g/dL\nHematocrit: 43%",
    },
    {
      id: 2,
      testName: "Lipid Panel",
      orderedDate: "2025-09-10",
      status: "Pending",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ testName: "" });

  const [viewer, setViewer] = useState<LabOrder | null>(null);

  const [alert, setAlert] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const newLab: LabOrder = {
        id: Date.now(),
        testName: form.testName,
        orderedDate: new Date().toISOString().split("T")[0],
        status: "Pending",
      };
      setLabs((prev) => [newLab, ...prev]);
      setForm({ testName: "" });
      setShowModal(false);
      setAlert({
        variant: "success",
        title: "Lab Ordered",
        message: "Your lab test has been requested successfully.",
      });
    } catch {
      setAlert({
        variant: "error",
        title: "Error",
        message: "Could not place lab order.",
      });
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Labs & Orders
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + Request Lab
          </button>
        </div>

        {/* alerts */}
        {alert && (
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
          />
        )}

        {/* table */}
        <div className="overflow-x-auto border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-4 py-2">Test Name</th>
                <th className="px-4 py-2">Ordered Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((lab) => (
                <tr
                  key={lab.id}
                  onClick={() => lab.status === "Completed" && setViewer(lab)}
                  className={`border-t cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    lab.status === "Completed" ? "" : "opacity-70 cursor-not-allowed"
                  }`}
                >
                  <td className="px-4 py-2">{lab.testName}</td>
                  <td className="px-4 py-2">{lab.orderedDate}</td>
                  <td
                    className={`px-4 py-2 font-medium ${
                      lab.status === "Completed"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {lab.status}
                  </td>
                  <td className="px-4 py-2">{lab.result ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* request modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Request New Lab
              </h2>
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm mb-1">Test Name</label>
                  <input
                    type="text"
                    name="testName"
                    value={form.testName}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="e.g., Complete Blood Count"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1 text-sm rounded bg-gray-300 dark:bg-gray-600 dark:text-white hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* result viewer modal */}
        {viewer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Lab Result: {viewer.testName}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Ordered Date: {viewer.orderedDate}
              </p>
              <p
                className={`text-sm font-medium ${
                  viewer.status === "Completed"
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
              >
                Status: {viewer.status}
              </p>

              {viewer.details ? (
                <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm whitespace-pre-wrap">
                  {viewer.details}
                </pre>
              ) : (
                <p className="text-gray-500 italic">No detailed report available.</p>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setViewer(null)}
                  className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
