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

    const handleSave = async () => {
        if (!user) return;
        const res = await fetchWithAuth("/api/users/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
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
