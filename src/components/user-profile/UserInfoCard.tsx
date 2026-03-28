"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { User } from "@/types/User";

/**
 * Format DOB for display (MM/DD/YYYY).
 */
function formatDOB(dob?: string | number[]): string {
  if (!dob) return "—";

  // Case 1: string format ("YYYY-MM-DD" or "YYYYMMDD")
  if (typeof dob === "string") {
    const d = dob.includes("-")
      ? new Date(dob)
      : new Date(`${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6, 8)}`);
    if (isNaN(d.getTime())) return "—";
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")}/${d.getFullYear()}`;
  }

  // Case 2: array format [YYYY, MM, DD]
  if (Array.isArray(dob) && dob.length === 3) {
    const [year, month, day] = dob;
    return `${String(month).padStart(2, "0")}/${String(day).padStart(
      2,
      "0"
    )}/${year}`;
  }

  return "—";
}

/**
 * Normalize DOB for <input type="date"> value ("YYYY-MM-DD").
 */
function normalizeDOBForInput(dob?: string | number[]): string {
  if (!dob) return "";
  if (typeof dob === "string") {
    return dob.includes("-")
      ? dob // already "YYYY-MM-DD"
      : `${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6, 8)}`;
  }
  if (Array.isArray(dob) && dob.length === 3) {
    const [year, month, day] = dob;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }
  return "";
}

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed: User = JSON.parse(stored);
      setUser(parsed);
      setFormData(parsed);
    }
  }, []);

  const handleSave = async () => {
    if (!user) return;
    const res = await fetchWithAuth("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        // always save DOB as string "YYYY-MM-DD"
        dateOfBirth: normalizeDOBForInput(formData.dateOfBirth),
      }),
    });
    if (res.ok) {
      const updated = { ...user, ...formData };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      closeModal();
    }
  };

  if (!user) return null;

  return (
    <div className="w-full h-full">
      <div className="p-6 border rounded-xl shadow-md hover:shadow-lg bg-white dark:bg-gray-900 h-full">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold flex items-center gap-2">
            ℹ️ Personal Information
          </h4>
          <button
            onClick={openModal}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✏️
          </button>
        </div>

        {/* View Mode */}
        <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-medium">First Name</p>
            <p>{user.firstName || "—"}</p>
          </div>
          <div>
            <p className="font-medium">Last Name</p>
            <p>{user.lastName || "—"}</p>
          </div>
          <div>
            <p className="font-medium">Email Address</p>
            <p>{user.email || "—"}</p>
          </div>
          <div>
            <p className="font-medium">Phone</p>
            <p>{user.phone || "—"}</p>
          </div>
          <div>
            <p className="font-medium">Date of Birth</p>
            <p>{formatDOB(user.dateOfBirth)}</p>
          </div>
        </div>
      </div>

      {/* Edit Mode */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-lg mx-auto">
        <div className="p-6">
          <h4 className="text-lg font-semibold mb-2">Edit Personal Information</h4>
          <p className="text-sm text-gray-500 mb-4">
            Update your details to keep your profile up-to-date.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <input
                value={formData.firstName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="w-full border p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <input
                value={formData.lastName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="w-full border p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full border p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full border p-2 rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <input
                type="date"
                value={normalizeDOBForInput(formData.dateOfBirth)}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full border p-2 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeModal} className="px-4 py-2 border rounded-lg">
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
