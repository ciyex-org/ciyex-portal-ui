"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { safeStr } from "@/utils/safeStr";
import { FlaskConical, AlertCircle, Eye, X } from "lucide-react";

type LabOrder = {
    id: number;
    testName: string;
    orderedDate: string;
    collectionDate?: string;
    resultDate?: string;
    status: string;
    result?: string;
    details?: string;
    providerName?: string;
};

function statusBadge(status?: string) {
    const s = (status || "").toLowerCase();
    const cls =
        s === "completed" || s === "resulted" ? "bg-green-100 text-green-700" :
        s === "pending" || s === "ordered" ? "bg-amber-100 text-amber-700" :
        s === "in_progress" || s === "processing" ? "bg-blue-100 text-blue-700" :
        s === "cancelled" ? "bg-red-100 text-red-700" :
        "bg-gray-100 text-gray-600";
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status || "Unknown"}</span>;
}

function normalizeDate(v: any): string | undefined {
    if (!v) return undefined;
    if (Array.isArray(v)) {
        const [y, m = 1, d = 1, hh = 0, mm = 0, ss = 0, ns = 0] = v;
        const ms = Math.floor((ns || 0) / 1e6);
        return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, ms).toISOString();
    }
    if (typeof v === "string") return v;
    return undefined;
}

function fmtDate(d?: string) {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch { return "—"; }
}

export default function LabsPage() {
    const [labs, setLabs] = useState<LabOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewer, setViewer] = useState<LabOrder | null>(null);

    const loadLabs = useCallback(async () => {
        try {
            const res = await fetchWithAuth("/api/portal/lab-orders");
            if (!res.ok) throw new Error("Failed to load lab orders");
            const data = await res.json();
            const raw: any[] = Array.isArray(data.data) ? data.data : (data.data?.content || []);
            setLabs(raw.map((item: any) => ({
                id: item.id,
                testName: safeStr(item.testName || item.testDisplay || item.orderName || item.test_name || item.name || item.testCode, "Lab Order"),
                orderedDate: normalizeDate(item.orderDate || item.orderDateTime || item.orderedDate || item.ordered_date || item.issued || item._lastUpdated) || "",
                collectionDate: normalizeDate(item.effectiveDate || item.collectedDate || item.collectionDate || item.collection_date || item.specimenCollectedDate || item.effectiveDateTime || item.effectivePeriod?.start || item.performedDateTime || item.occurrenceDateTime || item.sampleDate || item.collectedAt),
                resultDate: normalizeDate(item.reportedDate || item.resultDate || item.result_date || item.resultDateTime || item.signedAt || item.issued || item.completedDate),
                status: safeStr(item.status, "unknown"),
                result: safeStr(item.conclusion || item.result || item.resultValue) || undefined,
                details: safeStr(item.details || item.resultDetails || item.notes) || undefined,
                providerName: safeStr(item.physicianName || item.orderingProvider || item.performer || item.providerName || item.provider_name || item.providerDisplay) || undefined,
            })));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load lab orders");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadLabs(); }, [loadLabs]);

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Labs & Orders</h1>
                    <p className="text-sm text-gray-500 mt-0.5">View your laboratory test orders and results</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-800">Unable to load lab orders</h3>
                            <p className="text-sm text-amber-700 mt-1">Please contact your healthcare provider if you believe you should have access.</p>
                        </div>
                    </div>
                ) : labs.length === 0 ? (
                    <div className="text-center py-16">
                        <FlaskConical className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No lab orders found</h3>
                        <p className="text-sm text-gray-500 mt-1">Your lab orders and results will appear here once ordered by your provider.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ordered</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Result Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {labs.map((lab, i) => (
                                        <tr key={lab.id || i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">{lab.testName}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(lab.orderedDate)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(lab.collectionDate)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(lab.resultDate)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{lab.providerName || "—"}</td>
                                            <td className="px-4 py-3">{statusBadge(lab.status)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{lab.result || "—"}</td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => setViewer(lab)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors" title="View Details">
                                                    <Eye className="h-4 w-4" />
                                                    <span>View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 text-right">
                            {labs.length} order{labs.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                )}

                {/* Result Detail Modal */}
                {viewer && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setViewer(null); }}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">{viewer.testName}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{fmtDate(viewer.orderedDate)}</p>
                                </div>
                                <button onClick={() => setViewer(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Status:</span>
                                    {statusBadge(viewer.status)}
                                    {viewer.result && (
                                        <>
                                            <span className="text-xs text-gray-500 ml-3">Result:</span>
                                            <span className="text-sm font-medium text-gray-900">{viewer.result}</span>
                                        </>
                                    )}
                                </div>
                                {viewer.details && (
                                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                        {viewer.details}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
