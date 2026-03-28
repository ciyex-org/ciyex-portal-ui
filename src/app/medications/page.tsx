"use client";

import AdminLayout from "@/app/(admin)/layout";
import { useMedications } from "@/hooks/useMedications";
import { Pill, AlertCircle } from "lucide-react";

function statusBadge(status?: string) {
    const s = (status || "").toLowerCase();
    const cls =
        s === "active" ? "bg-green-100 text-green-700" :
        s === "discontinued" ? "bg-red-100 text-red-700" :
        s === "completed" ? "bg-blue-100 text-blue-700" :
        "bg-gray-100 text-gray-600";
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status || "Unknown"}</span>;
}

function fmtDate(d: string) {
    try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch { return d || "—"; }
}

export default function MedicationsPage() {
    const { medications, loading, error } = useMedications();

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Your current and past prescriptions</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-800">Unable to load medications</h3>
                            <p className="text-sm text-amber-700 mt-1">Please contact your healthcare provider if you believe you should have access.</p>
                        </div>
                    </div>
                ) : medications.length === 0 ? (
                    <div className="text-center py-16">
                        <Pill className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No medications found</h3>
                        <p className="text-sm text-gray-500 mt-1">Your prescriptions will appear here once prescribed by your provider.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medication</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dosage</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Instructions</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prescribed</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {medications.map((m: any, i: number) => (
                                        <tr key={m.id || i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">{m.medicationName}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{m.dosage || "—"}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{m.instructions || "—"}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(m.dateIssued)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{m.prescribingDoctor || "—"}</td>
                                            <td className="px-4 py-3">{statusBadge(m.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 text-right">
                            {medications.length} medication{medications.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
