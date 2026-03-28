"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { User } from "@/types/User";

export default function UserAddressCard() {
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

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setSaveError(null);
        try {
            // Map address fields to demographics DTO format
            const payload = {
                firstName: formData.firstName || user.firstName,
                lastName: formData.lastName || user.lastName,
                address: formData.street || "",
                addressLine2: formData.street2 || "",
                city: formData.city || "",
                state: formData.state || "",
                postalCode: formData.postalCode || "",
                country: formData.country || "",
                contactEmail: formData.email || user.email,
                phoneMobile: formData.phone || user.phone,
            };
            const res = await fetchWithAuth("/api/portal/patients/me/demographics", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const resData = await res.json().catch(() => ({}));
            if (res.ok && resData.success !== false) {
                const updated = { ...user, ...formData };
                localStorage.setItem("user", JSON.stringify(updated));
                setUser(updated);
                closeModal();
            } else {
                setSaveError(resData.message || `Save failed (HTTP ${res.status})`);
            }
        } catch {
            setSaveError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="w-full h-full">
            <div className="p-6 border rounded-xl shadow-md hover:shadow-lg bg-white dark:bg-gray-900 h-full">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold flex items-center gap-2">📍 Address</h4>
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
                        <p className="font-medium">Street</p>
                        <p>{user.street || "—"}</p>
                    </div>
                    <div>
                        <p className="font-medium">Street 2</p>
                        <p>{user.street2 || "—"}</p>
                    </div>
                    <div>
                        <p className="font-medium">City / State</p>
                        <p>
                            {user.city || "—"}
                            {user.state ? `, ${user.state}` : ""}
                        </p>
                    </div>
                    <div>
                        <p className="font-medium">Postal Code</p>
                        <p>{user.postalCode || "—"}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="font-medium">Country</p>
                        <p>{user.country || "—"}</p>
                    </div>
                </div>
            </div>

            {/* Edit Mode */}
            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-lg mx-auto">
                <div className="p-6">
                    <h4 className="text-lg font-semibold mb-2">Edit Address</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Update your details to keep your profile up-to-date.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Street</label>
                            <input
                                value={formData.street || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, street: e.target.value })
                                }
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Street 2</label>
                            <input
                                value={formData.street2 || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, street2: e.target.value })
                                }
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">City</label>
                            <input
                                value={formData.city || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, city: e.target.value })
                                }
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">State</label>
                            <input
                                value={formData.state || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, state: e.target.value })
                                }
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Postal Code</label>
                            <input
                                value={formData.postalCode || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, postalCode: e.target.value })
                                }
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Country</label>
                            <input
                                value={formData.country || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, country: e.target.value })
                                }
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                    </div>

                    {saveError && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {saveError}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={closeModal} className="px-4 py-2 border rounded-lg">
                            Close
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`px-4 py-2 text-white rounded-lg ${saving ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
