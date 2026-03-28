"use client";

import AdminLayout from "@/app/(admin)/layout";
import { useVitals } from "@/hooks/useVitals";
import { Activity, Heart, Thermometer, Wind, Scale, AlertCircle } from "lucide-react";

function statusColor(value: number, low: number, high: number) {
    if (value >= high) return "bg-red-100 text-red-700";
    if (value >= low) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
}

export default function VitalsPage() {
    const { vitals, loading, error } = useVitals();

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vitals</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Your health measurements over time</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-800">Unable to load vitals</h3>
                            <p className="text-sm text-amber-700 mt-1">Please contact your healthcare provider if you believe you should have access.</p>
                        </div>
                    </div>
                ) : vitals.length === 0 ? (
                    <div className="text-center py-16">
                        <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No vitals recorded</h3>
                        <p className="text-sm text-gray-500 mt-1">Your vitals will appear here once recorded by your provider.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Blood Pressure</div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Heart Rate</div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" /> Temp</div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5"><Wind className="h-3.5 w-3.5" /> SpO2</div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" /> Weight / BMI</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {vitals.map((v: any, i: number) => (
                                        <tr key={v.id || i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                {v.bpSystolic && v.bpDiastolic ? (
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(v.bpSystolic, 120, 140)}`}>
                                                        {v.bpSystolic}/{v.bpDiastolic}
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {v.pulse ? (
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${v.pulse >= 100 ? "bg-red-100 text-red-700" : v.pulse < 60 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                                        {v.pulse} <span className="font-normal ml-0.5">bpm</span>
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(v.temperatureF || v.temperatureC) ? (
                                                    <span className="text-sm text-gray-900">{v.temperatureF || v.temperatureC}°{v.temperatureF ? "F" : "C"}</span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {v.oxygenSaturation ? (
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${v.oxygenSaturation >= 95 ? "bg-green-100 text-green-700" : v.oxygenSaturation >= 90 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                                        {v.oxygenSaturation}%
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(v.weightKg || v.weightLbs) ? (
                                                    <div className="text-sm">
                                                        <span className="font-medium text-gray-900">{v.weightKg ? `${v.weightKg} kg` : `${v.weightLbs} lbs`}</span>
                                                        {v.bmi && <span className="text-gray-500 ml-2">BMI {v.bmi}</span>}
                                                    </div>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Normal</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Elevated</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High</span>
                            <span className="ml-auto">{vitals.length} record{vitals.length !== 1 ? "s" : ""}</span>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
