"use client";

import { useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { Bell, ShieldCheck, Lock, Settings2 } from "lucide-react";

const TABS = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: ShieldCheck },
    { id: "security", label: "Security", icon: Lock },
    { id: "preferences", label: "Preferences", icon: Settings2 },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? "bg-blue-600" : "bg-gray-200"}`}
        >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
        </button>
    );
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("notifications");

    const [notifications, setNotifications] = useState({
        appointmentReminders: true,
        labResults: true,
        medicationReminders: true,
        messageAlerts: true,
        billingNotices: true,
    });

    const [privacy, setPrivacy] = useState({
        shareDataWithProviders: true,
        allowTelehealth: true,
        emergencyAccess: true,
    });

    const notifDescriptions: Record<string, string> = {
        appointmentReminders: "Get reminded about upcoming appointments",
        labResults: "Be notified when lab results are available",
        medicationReminders: "Get reminders for medication schedules",
        messageAlerts: "Be notified about new messages from providers",
        billingNotices: "Get notified about new bills and payments",
    };

    const privacyDescriptions: Record<string, string> = {
        shareDataWithProviders: "Allow sharing medical data with healthcare providers",
        allowTelehealth: "Enable telehealth appointments and consultations",
        emergencyAccess: "Allow emergency access to your medical records",
    };

    function humanize(key: string) {
        return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
    }

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your account settings and preferences</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Tab nav */}
                    <div className="border-b border-gray-200">
                        <nav className="flex px-4">
                            {TABS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                        activeTab === id
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab content */}
                    <div className="p-6">
                        {activeTab === "notifications" && (
                            <div className="space-y-5">
                                <h2 className="text-base font-semibold text-gray-900">Notification Preferences</h2>
                                <div className="divide-y divide-gray-100">
                                    {Object.entries(notifications).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between py-3">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">{humanize(key)}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{notifDescriptions[key]}</p>
                                            </div>
                                            <Toggle checked={value} onChange={(v) => setNotifications((p) => ({ ...p, [key]: v }))} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "privacy" && (
                            <div className="space-y-5">
                                <h2 className="text-base font-semibold text-gray-900">Privacy Settings</h2>
                                <div className="divide-y divide-gray-100">
                                    {Object.entries(privacy).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between py-3">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">{humanize(key)}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{privacyDescriptions[key]}</p>
                                            </div>
                                            <Toggle checked={value} onChange={(v) => setPrivacy((p) => ({ ...p, [key]: v }))} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "security" && (
                            <div className="space-y-6">
                                <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
                                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                                    <h3 className="text-sm font-medium text-gray-900">Change Password</h3>
                                    <input type="password" placeholder="Current Password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                    <input type="password" placeholder="New Password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                    <input type="password" placeholder="Confirm New Password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Update Password</button>
                                </div>
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                                    <p className="text-xs text-gray-500 mt-1 mb-3">Add an extra layer of security to your account</p>
                                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">Enable 2FA</button>
                                </div>
                            </div>
                        )}

                        {activeTab === "preferences" && (
                            <div className="space-y-5">
                                <h2 className="text-base font-semibold text-gray-900">Preferences</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            <option value="en">English</option>
                                            <option value="es">Spanish</option>
                                            <option value="fr">French</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            <option value="EST">Eastern Time (EST)</option>
                                            <option value="CST">Central Time (CST)</option>
                                            <option value="MST">Mountain Time (MST)</option>
                                            <option value="PST">Pacific Time (PST)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                        </select>
                                    </div>
                                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Save Preferences</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
