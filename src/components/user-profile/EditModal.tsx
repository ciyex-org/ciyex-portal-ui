"use client";
import React from "react";
import Button from "@/components/ui/button/Button";

interface EditModalProps {
    title: string;
    description?: string;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    children: React.ReactNode;
}

export function EditModal({ title, description, isOpen, onClose, onSave, children }: EditModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-2xl mx-4 p-8 relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                {/* Title */}
                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>
                )}

                {/* Form */}
                <div className="space-y-4">{children}</div>

                {/* Footer */}
                <div className="flex justify-end gap-3 mt-8">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={onSave}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}
