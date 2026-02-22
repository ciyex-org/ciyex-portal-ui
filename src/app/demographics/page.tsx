"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { User, MapPin, Phone, AlertCircle, Pencil, Save, X } from "lucide-react";

type Demographics = {
    id?: number;
    portalUserId?: number;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string | number[];
    gender?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    ehrPatientId?: number;
    medicalRecordNumber?: string;
};

function parseDob(dob: string | number[] | undefined): string | undefined {
    if (Array.isArray(dob) && dob.length === 3) {
        const [year, month, day] = dob;
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return typeof dob === "string" ? dob : undefined;
}

function toDobArray(dob: string | undefined): number[] | undefined {
    if (!dob) return undefined;
    const [year, month, day] = dob.split("-").map(Number);
    return [year, month, day];
}

async function safeJson(res: Response) {
    const text = await res.text();
    try { return text ? JSON.parse(text) : {}; } catch { throw new Error("Invalid JSON from server"); }
}

export default function DemographicsPage() {
    const API = getEnv("NEXT_PUBLIC_API_URL");
    const [demographics, setDemographics] = useState<Demographics | null>(null);
    const [original, setOriginal] = useState<Demographics | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetchWithAuth(`${API}/api/portal/patient/me`, { headers: { Accept: "application/json" } });
                if (!res.ok) throw new Error("Failed to load demographics");
                const response = await safeJson(res);
                if (!response.data) throw new Error("No demographics data found");
                const formatted = { ...response.data, dateOfBirth: parseDob(response.data.dateOfBirth) };
                setDemographics(formatted);
                setOriginal(formatted);
            } catch (err) {
                setAlert({ type: "error", message: err instanceof Error ? err.message : "Could not load demographics" });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [API]);

    useEffect(() => {
        if (alert) { const t = setTimeout(() => setAlert(null), 4000); return () => clearTimeout(t); }
    }, [alert]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setDemographics((prev) => prev ? { ...prev, [name]: value } : prev);
    }

    async function handleSave() {
        try {
            const payload = { ...demographics, dateOfBirth: toDobArray(demographics?.dateOfBirth as string) };
            const res = await fetchWithAuth(`${API}/api/portal/patients/me/demographics`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to update demographics");
            const response = await safeJson(res);
            if (response.data) {
                const formatted = { ...response.data, dateOfBirth: parseDob(response.data.dateOfBirth) };
                setDemographics(formatted);
                setOriginal(formatted);
            }
            setEditMode(false);
            setAlert({ type: "success", message: "Demographics updated successfully." });
        } catch {
            setAlert({ type: "error", message: "Failed to update demographics." });
        }
    }

    function Field({ label, value, name, type = "text" }: { label: string; value?: unknown; name?: string; type?: string }) {
        if (editMode && name) {
            return (
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                    <input
                        name={name}
                        type={type}
                        value={String(value || "")}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            );
        }
        return (
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <div className="px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-100">
                    {value === null || value === undefined || value === "" ? "—" : String(value)}
                </div>
            </div>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {demographics ? `${demographics.firstName} ${demographics.lastName}` : "Demographics"}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {demographics?.ehrPatientId ? `Patient ID: ${demographics.ehrPatientId}` : "Your personal information"}
                        </p>
                    </div>
                    {!editMode ? (
                        <button onClick={() => setEditMode(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            <Pencil className="h-4 w-4" /> Edit Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                                <Save className="h-4 w-4" /> Save
                            </button>
                            <button onClick={() => { setEditMode(false); setDemographics(original); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                <X className="h-4 w-4" /> Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Alert */}
                {alert && (
                    <div className={`flex items-start gap-3 rounded-xl p-4 ${alert.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                        <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${alert.type === "success" ? "text-green-600" : "text-red-600"}`} />
                        <p className={`text-sm ${alert.type === "success" ? "text-green-700" : "text-red-700"}`}>{alert.message}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : demographics ? (
                    <div className="space-y-6">
                        {/* Personal Info */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                                <User className="h-4 w-4 text-blue-600" /> Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="First Name" value={demographics.firstName} name="firstName" />
                                <Field label="Last Name" value={demographics.lastName} name="lastName" />
                                <Field label="Email" value={demographics.email} name="email" type="email" />
                                <Field label="Phone Number" value={demographics.phoneNumber} name="phoneNumber" type="tel" />
                                <Field label="Date of Birth" value={demographics.dateOfBirth} name="dateOfBirth" type="date" />
                                <Field label="Gender" value={demographics.gender} name="gender" />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                                <MapPin className="h-4 w-4 text-blue-600" /> Address
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Address Line 1" value={demographics.addressLine1} name="addressLine1" />
                                <Field label="Address Line 2" value={demographics.addressLine2} name="addressLine2" />
                                <Field label="City" value={demographics.city} name="city" />
                                <Field label="State" value={demographics.state} name="state" />
                                <Field label="Postal Code" value={demographics.postalCode} name="postalCode" />
                                <Field label="Country" value={demographics.country} name="country" />
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                                <Phone className="h-4 w-4 text-red-600" /> Emergency Contact
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Contact Name" value={demographics.emergencyContactName} name="emergencyContactName" />
                                <Field label="Contact Phone" value={demographics.emergencyContactPhone} name="emergencyContactPhone" type="tel" />
                                <Field label="Relationship" value={demographics.emergencyContactRelationship} name="emergencyContactRelationship" />
                            </div>
                        </div>

                        {/* Medical Records (always read-only) */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-semibold text-gray-900 mb-4">Medical Records</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="EHR Patient ID" value={demographics.ehrPatientId} />
                                <Field label="Medical Record Number" value={demographics.medicalRecordNumber} />
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </AdminLayout>
    );
}
