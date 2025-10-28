"use client";

import { useEffect, useState, useCallback } from "react";

import AdminLayout from "@/app/(admin)/layout";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type Topic = {
  id: string;
  orgId: string;
  title: string;
  summary: string;
  category: string;
  language: string;
  readingLevel: string;
  content: string;
};

type AssignedItem = {
  id: string;
  topicId: string;
  patientId: string;
  delivered: boolean;
};

export default function PatientEducationPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [, setAssigned] = useState<AssignedItem[]>([]);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Topic>>({
    title: "",
    summary: "",
    category: "",
    language: "",
    readingLevel: "",
    content: "",
  });

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education`
      );
      const data = await res.json();
      setTopics(data.content || []);
    } catch {
      showAlert("error", "Failed to load topics");
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education-assignments`
      );
      const data = await res.json();
      setAssigned(data.content || []);
    } catch {
      showAlert("error", "Failed to load assignments");
    }
  }, []);

  useEffect(() => {
    loadTopics();
    loadAssignments();
  }, [loadTopics, loadAssignments]);

  const assignTopic = async (topicId: string) => {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education-assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, patientId: "some-patient-id" }),
        }
      );
      if (res.ok) {
        showAlert("success", "Topic assigned successfully");
        loadAssignments();
      } else throw new Error();
    } catch {
      showAlert("error", "Failed to assign topic");
    }
  };

  const saveTopic = async () => {
    try {
      const method = selected ? "PUT" : "POST";
      const url = selected
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education/${selected.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education`;

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showAlert("success", selected ? "Topic updated" : "Topic created");
        setShowModal(false);
        setSelected(null);
        setForm({
          title: "",
          summary: "",
          category: "",
          language: "",
          readingLevel: "",
          content: "",
        });
        loadTopics();
      } else throw new Error();
    } catch {
      showAlert("error", "Failed to save topic");
    }
  };

  const deleteTopic = async (id: string) => {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education/${id}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        showAlert("success", "Topic deleted");
        loadTopics();
      } else throw new Error();
    } catch {
      showAlert("error", "Failed to delete topic");
    }
  };

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  return (
    <AdminLayout>
      {alert && <Alert message={alert.message} variant={"success"} title={""} />}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Patient Education</h1>
        <Button onClick={() => setShowModal(true)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Topic
        </Button>
      </div>

      {/* topics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800"
          >
            <h2 className="text-lg font-semibold">{topic.title}</h2>
            <p className="text-sm text-gray-600">{topic.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => assignTopic(topic.id)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                Assign
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(topic)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 3v18" />
                  <path d="M12 3c-2 0-6 .5-8 2v14c2-1.5 6-2 8-2" />
                  <path d="M12 3c2 0 6 .5 8 2v14c-2-1.5 6-2-8-2" />
                </svg>
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelected(topic);
                  setForm(topic);
                  setShowModal(true);
                }}
              >
                ✏️ Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteTopic(topic.id)}
              >
                🗑 Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* preview drawer */}
      {selected && !showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg h-full overflow-y-auto p-6">
            <button
              onClick={() => setSelected(null)}
              className="mb-4 text-sm text-gray-500 hover:underline flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Close
            </button>
            <h2 className="text-xl font-bold mb-2">{selected.title}</h2>
            <p className="mb-4">{selected.summary}</p>
            <div dangerouslySetInnerHTML={{ __html: selected.content }} />
          </div>
        </div>
      )}

      {/* create/edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">
              {selected ? "Edit Topic" : "New Topic"}
            </h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Title"
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                placeholder="Summary"
                value={form.summary || ""}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                placeholder="Content"
                value={form.content || ""}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
                rows={6}
              />
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button onClick={saveTopic}>
                  {selected ? "Update" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
