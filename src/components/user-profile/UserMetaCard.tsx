"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { User } from "@/types/User";

export default function UserMetaCard() {
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
                    <h4 className="text-xl font-semibold flex items-center gap-2">👤 Profile</h4>
                    <button
                        onClick={openModal}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        ✏️
                    </button>
                </div>

                {/* View Mode */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 text-white text-xl font-bold">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">
                        <p className="font-semibold text-lg">
                            {user.firstName} {user.lastName}
                        </p>
                        <p>{user.email || "—"}</p>
                        <p>{user.phone || "—"}</p>
                    </div>
                </div>
            </div>

            {/* Edit Mode */}
            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-lg mx-auto">
                <div className="p-6">
                    <h4 className="text-lg font-semibold mb-2">Edit Profile</h4>

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
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                type="email"
                                value={formData.email || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="w-full border p-2 rounded-lg"
                            />
                        </div>
                        <div className="col-span-2">
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
