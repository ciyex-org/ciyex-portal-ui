"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useRouter } from "next/navigation";
import { Calendar, Plus, X, Eye, Video, Clock, MapPin, AlertCircle, Loader2 } from "lucide-react";

async function safeJson(res: Response) {
    const text = await res.text();
    try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

function fmtDate(d: string) {
    try { return new Date(d).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }); } catch { return d; }
}

function fmtTime(t?: string) {
    if (!t) return "";
    if (t.includes("AM") || t.includes("PM")) return t;
    try {
        const [h, m] = t.split(":");
        const h24 = parseInt(h);
        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
        return `${h12}:${m} ${h24 >= 12 ? "PM" : "AM"}`;
    } catch { return t; }
}

type Appointment = {
    id?: number; visitType: string; patientId?: number; providerId: number;
    appointmentStartDate: string; appointmentEndDate: string; appointmentStartTime: string; appointmentEndTime: string;
    formattedDate?: string; formattedTime?: string; priority: string; locationId: number;
    status?: string; reason: string; orgId?: number; providerName?: string; locationName?: string;
    patientName?: string; meetingUrl?: string;
};
type Provider = { id: number; identification: { firstName: string; lastName: string }; professionalDetails?: { specialty?: string } };
type Location = { id: number; name: string; address: string };

function statusBadge(status?: string) {
    const s = String(status || "").toUpperCase();
    const cls = s === "SCHEDULED" ? "bg-blue-100 text-blue-700" : s === "COMPLETED" ? "bg-green-100 text-green-700" : s === "PENDING" ? "bg-amber-100 text-amber-700" : s === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status || "Unknown"}</span>;
}

export default function AppointmentsPage() {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [visitTypes, setVisitTypes] = useState<string[]>([]);
    const [priorities, setPriorities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fetchingSlots, setFetchingSlots] = useState(false);
    const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [form, setForm] = useState({ providerId: "", locationId: "", date: "", time: "", reason: "", visitType: "", priority: "" });

    useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 5000); return () => clearTimeout(t); } }, [alert]);

    // Auth check
    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const user = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        if (!token || !user) { router.replace("/signin"); return; }
        try { const p = JSON.parse(user); if (!p?.token) { localStorage.removeItem("token"); localStorage.removeItem("user"); router.replace("/signin"); } } catch { localStorage.removeItem("token"); localStorage.removeItem("user"); router.replace("/signin"); }
    }, [router]);

    // Load data
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [apptRes, provRes, locRes] = await Promise.all([
                    fetchWithAuth("/api/portal/appointments"),
                    fetchWithAuth("/api/portal/providers"),
                    fetchWithAuth("/api/portal/locations"),
                ]);
                const [appts, provs, locs] = await Promise.all([safeJson(apptRes), safeJson(provRes), safeJson(locRes)]);
                const rawAppts: any[] = Array.isArray(appts.data) ? appts.data : (appts.data?.content || []);
                const normalizedAppts = rawAppts.map((a: any) => {
                    // Parse start datetime into date + time parts
                    const startStr: string = a.start || a.appointmentStart || a.appointmentStartDate || a.startDateTime || "";
                    const startDt = startStr ? new Date(startStr) : null;
                    const startDate = startDt && !isNaN(startDt.getTime())
                        ? `${String(startDt.getMonth()+1).padStart(2,"0")}/${String(startDt.getDate()).padStart(2,"0")}/${startDt.getFullYear()}`
                        : (a.appointmentStartDate || a.date || "");
                    const startTime = startDt && !isNaN(startDt.getTime())
                        ? `${String(startDt.getHours()).padStart(2,"0")}:${String(startDt.getMinutes()).padStart(2,"0")}:00`
                        : (a.appointmentStartTime || a.time || "");
                    // Parse end datetime
                    const endStr: string = a.end || a.appointmentEnd || a.appointmentEndDate || a.endDateTime || "";
                    const endDt = endStr ? new Date(endStr) : null;
                    const endDate = endDt && !isNaN(endDt.getTime())
                        ? `${String(endDt.getMonth()+1).padStart(2,"0")}/${String(endDt.getDate()).padStart(2,"0")}/${endDt.getFullYear()}`
                        : (a.appointmentEndDate || "");
                    const endTime = endDt && !isNaN(endDt.getTime())
                        ? `${String(endDt.getHours()).padStart(2,"0")}:${String(endDt.getMinutes()).padStart(2,"0")}:00`
                        : (a.appointmentEndTime || "");
                    // Extract numeric providerId / locationId from FHIR references
                    const providerRef: string = a.provider || "";
                    const locationRef: string = a.location || "";
                    const providerId = a.providerId || (providerRef.includes("/") ? Number(providerRef.split("/").pop()) : undefined);
                    const locationId = a.locationId || (locationRef.includes("/") ? Number(locationRef.split("/").pop()) : undefined);
                    // Safely extract appointmentType — FHIR may return it as an object (CodeableConcept)
                    const rawApptType = a.appointmentType;
                    const apptTypeStr = typeof rawApptType === "string" ? rawApptType
                        : (rawApptType?.text || rawApptType?.coding?.[0]?.display || "");
                    return {
                        ...a,
                        id: a.id ? Number(a.id) : undefined,
                        visitType: a.visitType && a.visitType !== "None" ? String(a.visitType) : apptTypeStr,
                        appointmentStartDate: startDate,
                        appointmentStartTime: startTime,
                        appointmentEndDate: endDate,
                        appointmentEndTime: endTime,
                        providerName: a.providerName || a.providerDisplay || "",
                        locationName: a.locationName || (a.locationDisplay && a.locationDisplay !== "None" ? a.locationDisplay : ""),
                        providerId: providerId,
                        locationId: locationId,
                    };
                });
                setAppointments(normalizedAppts);
                setProviders(provs.data || []);
                setLocations(locs.data || []);

                // Load visit types & priorities
                const defaultVt = ["Follow-Up", "New Patient", "Annual Physical", "Urgent Care", "Telehealth"];
                const defaultPr = ["Routine", "Urgent", "Emergency"];
                try {
                    const optRes = await fetchWithAuth("/api/portal/list-options");
                    const optData = await safeJson(optRes);
                    // Handle various response shapes
                    const rawVt = optData?.data?.visit_types || optData?.data?.visitTypes || optData?.visit_types || optData?.visitTypes || [];
                    const rawPr = optData?.data?.appointment_priorities || optData?.data?.appointmentPriorities || optData?.appointment_priorities || optData?.priorities || [];
                    let vt = Array.isArray(rawVt) ? rawVt.map((i: any) => String(i.title || i.value || i.name || i)).filter(Boolean) : [];
                    let pr = Array.isArray(rawPr) ? rawPr.map((i: any) => String(i.title || i.value || i.name || i)).filter(Boolean) : [];
                    if (!vt.length) vt = defaultVt;
                    if (!pr.length) pr = defaultPr;
                    setVisitTypes(vt);
                    setPriorities(pr);
                    setForm((f) => ({ ...f, visitType: f.visitType || vt[0], priority: f.priority || pr[0] }));
                } catch {
                    setVisitTypes(defaultVt);
                    setPriorities(defaultPr);
                    setForm((f) => ({ ...f, visitType: f.visitType || defaultVt[0], priority: f.priority || defaultPr[0] }));
                }
            } catch {
                setAlert({ type: "error", message: "Could not load appointments." });
            } finally { setLoading(false); }
        }
        load();
    }, []);

    function generateDefaultSlots() {
        const slots = [];
        for (let h = 9; h <= 16; h++) {
            const h12 = h > 12 ? h - 12 : h;
            slots.push({ appointmentStartTime: `${String(h).padStart(2, "0")}:00:00`, formattedTime: `${h12}:00 ${h >= 12 ? "PM" : "AM"}` });
        }
        return slots;
    }

    async function fetchSlots(providerId: string, date: string) {
        setFetchingSlots(true);
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) { setAvailableSlots(generateDefaultSlots()); return; }
            const isoDate = d.toISOString().split("T")[0];
            const legacyFmt = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
            let slots: any[] = [];
            for (const fmt of [isoDate, legacyFmt]) {
                try {
                    const res = await fetchWithAuth(`/api/portal/appointments/available-slots?provider_id=${providerId}&date=${fmt}&limit=10`);
                    const data = await safeJson(res);
                    const raw = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                    if (raw.length > 0) {
                        slots = raw.map((s: any) => {
                            const st = new Date(s.start || s.startTime || s.appointmentStartTime || "");
                            if (isNaN(st.getTime())) {
                                // If can't parse start time, use the raw time string
                                const rawTime = s.formattedTime || s.time || s.appointmentStartTime || "";
                                return { appointmentStartTime: rawTime, formattedTime: rawTime };
                            }
                            const h = st.getHours(), m = String(st.getMinutes()).padStart(2, "0");
                            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                            return { appointmentStartTime: `${String(h).padStart(2, "0")}:${m}:00`, formattedTime: `${h12}:${m} ${h >= 12 ? "PM" : "AM"}` };
                        }).filter((s: any) => s.appointmentStartTime);
                        break;
                    }
                } catch { /* try next format */ }
            }
            setAvailableSlots(slots.length > 0 ? slots : generateDefaultSlots());
        } catch {
            setAvailableSlots(generateDefaultSlots());
        } finally {
            setFetchingSlots(false);
        }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        const { name, value } = e.target;
        const newForm = { ...form, [name]: value };
        setForm(newForm);
        if (name === "date" && value && newForm.providerId) fetchSlots(newForm.providerId, value);
        if (name === "providerId" && value && newForm.date) fetchSlots(value, newForm.date);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.providerId || !form.locationId || !form.date || !form.time) {
            setAlert({ type: "error", message: "Please select provider, date, time, and location." });
            return;
        }
        // Build ISO datetime for FHIR start/end fields
        const d = new Date(form.date);
        const timeParts = form.time.split(":");
        d.setHours(parseInt(timeParts[0] || "0"), parseInt(timeParts[1] || "0"), 0, 0);
        const startIso = d.toISOString();
        const endDt = new Date(d.getTime() + 30 * 60 * 1000); // default 30 min duration
        const endIso = endDt.toISOString();

        // Resolve FHIR references for provider and location
        const prov = providers.find((p) => String(p.id) === String(form.providerId));
        const loc = locations.find((l) => String(l.id) === String(form.locationId));
        const providerRef = (prov as any)?.fhirId ? `Practitioner/${(prov as any).fhirId}` : String(form.providerId);
        const locationRef = (loc as any)?.fhirId ? `Location/${(loc as any).fhirId}` : String(form.locationId);

        setSubmitting(true);
        try {
            // Format date parts for legacy fields
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd2 = String(d.getDate()).padStart(2, "0");
            const yyyy = d.getFullYear();
            const legacyDate = `${mm}/${dd2}/${yyyy}`;
            const legacyTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
            const endLegacyTime = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}:00`;

            // Map to FHIR appointment tab_field_config keys + legacy fields
            const payload: Record<string, any> = {
                appointmentType: form.visitType || "Consultation",
                start: startIso,
                end: endIso,
                provider: providerRef,
                location: locationRef,
                reason: form.reason || "",
                priority: (form.priority || "routine").toLowerCase(),
                status: "proposed",
                visitType: form.visitType,
                providerId: Number(form.providerId),
                locationId: Number(form.locationId),
                appointmentStartDate: legacyDate,
                appointmentEndDate: legacyDate,
                appointmentStartTime: legacyTime,
                appointmentEndTime: endLegacyTime,
                appointmentDate: form.date,
                appointmentTime: legacyTime,
                date: form.date,
                time: legacyTime,
            };
            const res = await fetchWithAuth("/api/portal/appointments", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const saved = await safeJson(res);
            if (!res.ok || saved.success === false) {
                const errMsg = saved.message || saved.error || (res.status === 401 ? "Session expired. Please sign in again." : res.status === 403 ? "You don't have permission to create appointments." : "Failed to create appointment");
                throw new Error(errMsg);
            }
            const apptData = saved.data || saved;
            if (apptData && typeof apptData === "object" && !Array.isArray(apptData)) setAppointments((p) => [...p, apptData]);
            setShowModal(false);
            setAvailableSlots([]);
            setForm({ providerId: "", locationId: "", date: "", time: "", reason: "", visitType: visitTypes[0] || "", priority: priorities[0] || "" });
            setAlert({ type: "success", message: saved.message || "Appointment requested successfully." });
        } catch (err) {
            setAlert({ type: "error", message: err instanceof Error ? err.message : "Could not create appointment." });
        } finally { setSubmitting(false); }
    }

    function providerName(a: Appointment) {
        if (a.providerName) return a.providerName.replace(/^Dr\.?\s+/i, "");
        const p = providers.find((p) => p.id === a.providerId);
        if (!p) return `Provider #${a.providerId}`;
        const first = p.identification?.firstName || (p as any).firstName || "";
        const last = p.identification?.lastName || (p as any).lastName || "";
        return (first + " " + last).trim() || `Provider #${a.providerId}`;
    }

    function providerInitials(a: Appointment) {
        const name = providerName(a);
        return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
    }

    function isVirtual(vt?: string) {
        const s = String(vt || "").toLowerCase();
        return s.includes("virtual") || s.includes("telehealth") || s.includes("video") || s.includes("online") || s.includes("remote");
    }

    const dateOptions = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i);
        const val = d.toISOString().split("T")[0];
        const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return { val, label };
    });

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                        <p className="text-sm text-gray-500 mt-0.5">View and manage your healthcare appointments</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus className="h-4 w-4" /> Request Appointment
                    </button>
                </div>

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
                ) : appointments.length === 0 ? (
                    <div className="text-center py-16">
                        <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No appointments yet</h3>
                        <p className="text-sm text-gray-500 mt-1">Get started by requesting your first appointment.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {appointments.map((a, i) => {
                                        const loc = locations.find((l) => l.id === a.locationId);
                                        const prov = providers.find((p) => p.id === a.providerId);
                                        return (
                                            <tr key={a.id || i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.formattedDate || fmtDate(a.appointmentStartDate)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{a.formattedTime || fmtTime(a.appointmentStartTime)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">{providerInitials(a)}</div>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">{providerName(a)}</span>
                                                            {prov?.professionalDetails?.specialty && <div className="text-xs text-gray-400">{prov.professionalDetails.specialty}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {isVirtual(a.visitType) ? <Video className="h-3.5 w-3.5 text-green-600" /> : <MapPin className="h-3.5 w-3.5 text-blue-600" />}
                                                        <span className={`text-sm font-medium ${isVirtual(a.visitType) ? "text-green-600" : "text-blue-600"}`}>{a.visitType}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{a.locationName || loc?.name || `Location #${a.locationId}`}</td>
                                                <td className="px-4 py-3">{statusBadge(a.status)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {isVirtual(a.visitType) && (["scheduled", "pending", "booked", "arrived", "proposed"].includes(String(a.status || "").toLowerCase())) && a.id && (
                                                            <button onClick={() => window.open(`/telehealth/${a.id}`, "_blank")} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                                                                <Video className="h-3 w-3" /> Join
                                                            </button>
                                                        )}
                                                        <button onClick={() => setSelectedAppt(a)} className="p-1 text-blue-600 hover:text-blue-800 transition-colors" title="View Details">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 text-right">
                            {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedAppt && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedAppt(null); }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-base font-semibold text-gray-900">Appointment Details</h3>
                            <button onClick={() => setSelectedAppt(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-4 space-y-3 text-sm">
                            <div><span className="text-xs text-gray-500">Date</span><div className="font-medium text-gray-900">{selectedAppt.formattedDate || fmtDate(selectedAppt.appointmentStartDate)}</div></div>
                            <div><span className="text-xs text-gray-500">Time</span><div className="font-medium text-gray-900">{selectedAppt.formattedTime || fmtTime(selectedAppt.appointmentStartTime)}</div></div>
                            <div><span className="text-xs text-gray-500">Provider</span><div className="font-medium text-gray-900">{providerName(selectedAppt)}</div></div>
                            <div><span className="text-xs text-gray-500">Location</span><div className="font-medium text-gray-900">{selectedAppt.locationName || locations.find((l) => l.id === selectedAppt.locationId)?.name}</div></div>
                            <div><span className="text-xs text-gray-500">Reason</span><div className="font-medium text-gray-900">{selectedAppt.reason || "—"}</div></div>
                            <div><span className="text-xs text-gray-500">Status</span><div className="mt-1">{statusBadge(selectedAppt.status)}</div></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Request Appointment</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Schedule your healthcare visit</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Provider *</label>
                                <select name="providerId" value={form.providerId} onChange={handleChange} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Choose provider</option>
                                    {providers.map((p) => { const first = p.identification?.firstName || (p as any).firstName || ""; const last = p.identification?.lastName || (p as any).lastName || ""; return <option key={p.id} value={p.id}>Dr. {first} {last}{p.professionalDetails?.specialty ? ` - ${p.professionalDetails.specialty}` : ""}</option>; })}
                                </select>
                            </div>

                            {form.providerId && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                                    <select name="date" value={form.date} onChange={handleChange} required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="">Select a date</option>
                                        {dateOptions.map(({ val, label }) => <option key={val} value={val}>{label}</option>)}
                                    </select>
                                </div>
                            )}

                            {form.providerId && form.date && fetchingSlots && (
                                <div className="flex items-center justify-center gap-2 py-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <span className="text-sm text-gray-500">Loading slots...</span>
                                </div>
                            )}
                            {form.providerId && form.date && !fetchingSlots && availableSlots.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Time Slot *</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {availableSlots.map((s, i) => (
                                            <button key={i} type="button" onClick={() => setForm((f) => ({ ...f, time: s.appointmentStartTime }))}
                                                className={`px-2 py-2 rounded-lg text-sm font-medium border transition-colors ${form.time === s.appointmentStartTime ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
                                                <Clock className="h-3.5 w-3.5 inline mr-1" />{s.formattedTime}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {form.providerId && form.date && !fetchingSlots && availableSlots.length === 0 && (
                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700">No available slots for this date. Try another date.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
                                <select name="locationId" value={form.locationId} onChange={handleChange} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Choose location</option>
                                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.address ? ` - ${l.address}` : ""}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Visit</label>
                                <textarea name="reason" value={form.reason} onChange={handleChange} rows={2} placeholder="Describe symptoms or reason..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Visit Type</label>
                                    <select name="visitType" value={form.visitType} onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="">Select</option>
                                        {visitTypes.map((vt, i) => <option key={i} value={vt}>{vt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                                    <select name="priority" value={form.priority} onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="">Select</option>
                                        {priorities.map((p, i) => <option key={i} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            {isVirtual(form.visitType) && (
                                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                                    <Video className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-green-800">Virtual Appointment</p>
                                        <p className="text-xs text-green-700 mt-0.5">You&apos;ll receive a video call link once confirmed.</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                                <button type="submit" disabled={!form.time || !form.providerId || !form.locationId || submitting}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${form.time && form.providerId && form.locationId && !submitting ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Submitting...</> : "Request"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
