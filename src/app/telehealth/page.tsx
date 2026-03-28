"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { Video, Calendar, Clock, AlertCircle } from "lucide-react";

type Appointment = {
    id?: number;
    visitType: string;
    appointmentStartDate: string;
    appointmentStartTime: string;
    status?: string;
    providerName?: string;
    reason?: string;
    formattedDate?: string;
    formattedTime?: string;
};

function fmtDate(d: string) {
    try { return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}

function fmtTime(t: string) {
    if (!t || t.includes("AM") || t.includes("PM")) return t || "";
    try { const [h, m] = t.split(":"); const h24 = parseInt(h); const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24; return `${h12}:${m} ${h24 >= 12 ? "PM" : "AM"}`; } catch { return t; }
}

function isVirtual(vt?: string) {
    const s = (vt || "").toLowerCase();
    return s.includes("virtual") || s.includes("telehealth") || s.includes("video") || s.includes("online") || s.includes("remote");
}

export default function TelehealthPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth("/api/portal/appointments");
                if (!res.ok) { setLoading(false); return; }
                const data = await res.json();
                const all = Array.isArray(data.data) ? data.data : (data.data?.content || []);
                const now = Date.now();
                const virtual = all.filter((a: any) => {
                    const vt = isVirtual(a.visitType || a.appointmentType);
                    const upcoming = new Date(a.appointmentStartDate || a.appointmentDate || "").getTime() > now - 86400000;
                    const active = !["cancelled", "no_show", "completed"].includes((a.status || "").toLowerCase());
                    return vt && upcoming && active;
                });
                setAppointments(virtual);
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Telehealth</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Join your virtual healthcare appointments</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-16">
                        <Video className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No telehealth appointments</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            You don&apos;t have any upcoming virtual appointments. Schedule one from the{" "}
                            <a href="/appointments" className="text-blue-600 hover:text-blue-700">Appointments</a> page.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {appointments.map((a, i) => (
                            <div key={a.id || i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-green-50 rounded-xl">
                                            <Video className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900">{a.visitType || "Virtual Visit"}</h3>
                                            <p className="text-sm text-gray-600 mt-0.5">{a.providerName || "Your Provider"}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{a.formattedDate || fmtDate(a.appointmentStartDate)}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{a.formattedTime || fmtTime(a.appointmentStartTime)}</span>
                                            </div>
                                            {a.reason && <p className="text-xs text-gray-400 mt-1">Reason: {a.reason}</p>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                            (a.status || "").toUpperCase() === "SCHEDULED" ? "bg-blue-100 text-blue-700" :
                                            (a.status || "").toUpperCase() === "PENDING" ? "bg-amber-100 text-amber-700" :
                                            "bg-gray-100 text-gray-600"
                                        }`}>{a.status || "Scheduled"}</span>
                                        {a.id && (
                                            <a href={`/telehealth/${a.id}`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                                                <Video className="h-4 w-4" /> Join Call
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700">Ensure your camera and microphone are enabled before joining. Your provider will start the session when ready.</p>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
