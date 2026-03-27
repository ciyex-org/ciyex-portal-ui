"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { safeStr } from "@/utils/safeStr";
import { useMedications } from "@/hooks/useMedications";
import { usePortalConfig } from "@/hooks/usePortalConfig";
import AdminLayout from "@/app/(admin)/layout";

/* ───── types ───── */
interface Appointment {
    id: number;
    appointmentDate: string;
    appointmentTime: string;
    providerName: string;
    appointmentType: string;
    status: string;
}

interface VitalReading {
    type: string;
    value: string;
    unit: string;
    date: string;
}

/* ───── page ───── */
export default function Dashboard() {
    const router = useRouter();
    const { isFeatureEnabled } = usePortalConfig();
    const { medications } = useMedications();

    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [vitals, setVitals] = useState<VitalReading[]>([]);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [educationTopics, setEducationTopics] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (!user) { router.push("/signin"); return; }

        try {
            const u = JSON.parse(user);
            setFirstName(u.firstName || u.name?.split(" ")[0] || "Patient");
            setEmail(u.email || "");
        } catch {
            router.push("/signin");
            return;
        }

        // Show dashboard immediately, load data in background
        setLoading(false);

        // Fire all data fetches in parallel — each one is independent and optional
        loadAppointments();
        loadVitals();
        loadUnreadCount();
        loadEducation();
        loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Convert Java date arrays [y,m,d,h,min,...] or strings to Date */
    const toDate = (v: any): Date | null => {
        if (!v) return null;
        if (Array.isArray(v)) {
            const [y, m = 1, d = 1, h = 0, min = 0, s = 0] = v;
            return new Date(y, m - 1, d, h, min, s);
        }
        if (typeof v === "string" || typeof v === "number") {
            let dt = new Date(v);
            if (isNaN(dt.getTime()) && typeof v === "string") {
                // Try MM/DD/YYYY format
                const parts = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                if (parts) {
                    const yr = parts[3].length === 2 ? 2000 + Number(parts[3]) : Number(parts[3]);
                    dt = new Date(yr, Number(parts[1]) - 1, Number(parts[2]));
                }
            }
            return isNaN(dt.getTime()) ? null : dt;
        }
        return null;
    };

    const loadAppointments = async () => {
        try {
            const res = await fetchWithAuth("/api/portal/appointments");
            if (!res.ok) return;
            const d = await res.json();
            if (d.success === false) return;
            const rawData = d.data ?? d;
            const dataList = Array.isArray(rawData) ? rawData : (rawData?.content || []);
            if (!dataList.length) return;
            const now = Date.now();
            // Parse all appointments with dates, keep all (no strict date filter)
            const withDates = dataList
                .map((a: any) => {
                    const raw = a.start || a.appointmentStartDate || a.appointmentDate || a.appointmentDateTime || a.date || a.startDateTime || "";
                    return { ...a, _dt: toDate(raw) };
                });
            // Sort: future first (ascending), then past (descending)
            withDates.sort((a: any, b: any) => {
                const aTime = a._dt?.getTime() ?? 0;
                const bTime = b._dt?.getTime() ?? 0;
                const aFuture = aTime > now;
                const bFuture = bTime > now;
                if (aFuture && !bFuture) return -1;
                if (!aFuture && bFuture) return 1;
                if (aFuture && bFuture) return aTime - bTime;
                return bTime - aTime;
            });
            const upcoming = withDates
                .slice(0, 3)
                .map((a: any) => {
                    const raw = a.start || a.appointmentStartDate || a.appointmentDate || a.appointmentDateTime || a.date || a.startDateTime || "";
                    const startDt = toDate(raw);
                    const dateStr = startDt ? startDt.toISOString() : String(raw);
                    const timeStr = startDt
                        ? `${String(startDt.getHours()).padStart(2, "0")}:${String(startDt.getMinutes()).padStart(2, "0")}:00`
                        : (a.appointmentStartTime || a.appointmentTime || "");
                    return {
                        id: a.id,
                        appointmentDate: dateStr,
                        appointmentTime: timeStr,
                        providerName: safeStr(a.providerName || a.providerDisplay, "Provider"),
                        appointmentType: safeStr(a.visitType || a.appointmentType, "Visit"),
                        status: safeStr(a.status, "scheduled"),
                    };
                });
            setAppointments(upcoming);
        } catch { /* optional */ }
    };

    const loadVitals = async () => {
        try {
            const res = await fetchWithAuth("/api/fhir/vitals/my");
            if (!res.ok) return;
            const d = await res.json();
            const rawData = d.data ?? d;
            // Handle both array and paginated { content: [...] } formats
            const dataList = Array.isArray(rawData) ? rawData : (rawData?.content || []);
            if (!dataList.length) return;
            const latest = dataList[0];
            const dateVal = latest.recordedAt || latest.effectiveDateTime || latest.date || "";
            const out: VitalReading[] = [];
            const sys = latest.bpSystolic ?? latest.systolicBP ?? latest.systolic ?? latest.systolicBloodPressure;
            const dia = latest.bpDiastolic ?? latest.diastolicBP ?? latest.diastolic ?? latest.diastolicBloodPressure;
            if (sys && dia)
                out.push({ type: "Blood Pressure", value: `${sys}/${dia}`, unit: "mmHg", date: dateVal });
            const hr = latest.pulse ?? latest.heartRate ?? latest.heart_rate ?? latest.hr;
            if (hr)
                out.push({ type: "Heart Rate", value: `${hr}`, unit: "bpm", date: dateVal });
            const spo2 = latest.oxygenSaturation ?? latest.spo2 ?? latest.spO2 ?? latest.o2Saturation ?? latest.oxygenSat;
            if (spo2)
                out.push({ type: "SpO2", value: `${spo2}`, unit: "%", date: dateVal });
            const weight = latest.weightKg ?? latest.weightLbs ?? latest.weight;
            const weightUnit = latest.weightKg ? "kg" : latest.weightLbs ? "lbs" : "kg";
            if (weight)
                out.push({ type: "Weight", value: `${weight}`, unit: weightUnit, date: dateVal });
            const bmiVal = latest.bmi ?? latest.BMI;
            if (bmiVal)
                out.push({ type: "BMI", value: Number(bmiVal).toFixed(1), unit: "", date: dateVal });
            setVitals(out);
        } catch { /* optional */ }
    };

    const loadUnreadCount = async () => {
        try {
            const res = await fetchWithAuth("/api/channels");
            if (!res.ok) return;
            const channels = await res.json();
            const total = (Array.isArray(channels) ? channels : channels.data || [])
                .reduce((n: number, c: any) => n + (c.unreadCount || 0), 0);
            setUnreadMessages(total);
        } catch { /* optional */ }
    };

    const loadEducation = async () => {
        try {
            const [topicsRes, assignRes] = await Promise.allSettled([
                fetchWithAuth("/api/patient-education?page=0&size=100"),
                fetchWithAuth("/api/portal/patient-education-assignments/my-assignments"),
            ]);
            const topics: any[] = [];
            if (topicsRes.status === "fulfilled" && topicsRes.value.ok) {
                const d = await topicsRes.value.json();
                const raw = d.data ?? d;
                // Handle { content: [...] }, direct array, or { data: { content: [...] } }
                const list = Array.isArray(raw) ? raw : (raw?.content || []);
                topics.push(...list);
            }
            const assigned: any[] = [];
            if (assignRes.status === "fulfilled" && assignRes.value.ok) {
                const d = await assignRes.value.json();
                const raw = d.data ?? d;
                const list = Array.isArray(raw) ? raw : (raw?.content || []);
                assigned.push(...list);
            }
            // Combine: show assigned first, then general topics
            const combined = [
                ...assigned.map((a: any) => ({
                    id: a.id,
                    title: safeStr(a.materialTitle || a.topic?.title, "Education Material"),
                    category: safeStr(a.materialCategory || a.topic?.category, "General"),
                    assigned: true,
                })),
                ...topics.slice(0, 6).map((t: any) => ({
                    id: t.id,
                    title: safeStr(t.title, "Untitled"),
                    category: safeStr(t.category, "General"),
                    assigned: false,
                })),
            ];
            // Deduplicate by title
            const seen = new Set<string>();
            const unique = combined.filter((t) => {
                if (seen.has(t.title)) return false;
                seen.add(t.title);
                return true;
            });
            setEducationTopics(unique.slice(0, 6));
        } catch { /* optional */ }
    };

    const loadDocuments = async () => {
        try {
            const res = await fetchWithAuth("/api/fhir/portal/documents/my");
            if (!res.ok) return;
            const d = await res.json();
            if (d.success === false) return;
            const rawList = Array.isArray(d.data) ? d.data : (d.data?.content || []);
            const mapped = rawList.slice(0, 5).map((item: any) => ({
                id: item.id,
                fileName: safeStr(item.fileName ?? item.filename ?? item.name, "Document"),
                category: safeStr(item.category, "Medical Records"),
                createdDate: safeStr(item.documentDate || item.createdDate || item.created_date || item.uploadDate),
            }));
            setDocuments(mapped);
        } catch { /* optional */ }
    };

    const fmtDate = (s: string) => {
        try { return new Date(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
        catch { return s; }
    };
    const fmtTime = (s: string) => {
        try { return new Date(`2000-01-01T${s}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
        catch { return s; }
    };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* ─── Greeting ─── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {greeting()}, {firstName}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">Here&apos;s a snapshot of your health</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                        {isFeatureEnabled("appointments") && (
                            <button
                                onClick={() => router.push("/appointments")}
                                className="px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Book appointment
                            </button>
                        )}
                        {isFeatureEnabled("messaging") && (
                            <button
                                onClick={() => router.push("/messages")}
                                className="px-3.5 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                Send message
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── Stat Cards ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {isFeatureEnabled("appointments") && (
                        <StatCard
                            label="Upcoming visits"
                            value={appointments.length}
                            sub={appointments.length > 0 ? `Next: ${fmtDate(appointments[0].appointmentDate)}` : "None scheduled"}
                            color="blue"
                            onClick={() => router.push("/appointments")}
                        />
                    )}
                    {isFeatureEnabled("medications") && (
                        <StatCard
                            label="Medications"
                            value={medications.length}
                            sub={medications.length > 0 ? "active prescriptions" : "No active meds"}
                            color="purple"
                            onClick={() => router.push("/medications")}
                        />
                    )}
                    {isFeatureEnabled("messaging") && (
                        <StatCard
                            label="Messages"
                            value={unreadMessages}
                            sub={unreadMessages > 0 ? "unread" : "All caught up"}
                            color="green"
                            onClick={() => router.push("/messages")}
                        />
                    )}
                    {isFeatureEnabled("vitals") && (
                        <StatCard
                            label="Vitals"
                            value={vitals.length}
                            sub={vitals.length > 0 ? "latest readings" : "No recent vitals"}
                            color="orange"
                            onClick={() => router.push("/vitals")}
                        />
                    )}
                </div>

                {/* ─── Main Grid ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left 3 cols */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Upcoming Appointments */}
                        {isFeatureEnabled("appointments") && (
                            <Card
                                title="Upcoming Appointments"
                                action={{ label: "View all", onClick: () => router.push("/appointments") }}
                            >
                                {appointments.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {appointments.map((a) => (
                                            <div key={a.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                                                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-50 flex flex-col items-center justify-center">
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase leading-none">
                                                        {new Date(a.appointmentDate).toLocaleDateString("en-US", { month: "short" })}
                                                    </span>
                                                    <span className="text-base font-bold text-blue-700 leading-tight">
                                                        {new Date(a.appointmentDate).getDate()}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{a.appointmentType}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {a.providerName} &middot; {a.appointmentTime ? fmtTime(a.appointmentTime) : ""}
                                                    </p>
                                                </div>
                                                <StatusPill status={a.status} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={CalendarIcon}
                                        message="No upcoming appointments"
                                        action={{ label: "Schedule now", onClick: () => router.push("/appointments") }}
                                    />
                                )}
                            </Card>
                        )}

                        {/* Current Medications */}
                        {isFeatureEnabled("medications") && (
                            <Card
                                title="Current Medications"
                                action={{ label: "View all", onClick: () => router.push("/medications") }}
                            >
                                {medications.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {medications.slice(0, 4).map((m: any) => (
                                            <div key={m.id} className="py-3 first:pt-0 last:pb-0">
                                                <p className="text-sm font-semibold text-gray-900">{m.medicationName}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {m.dosage || "–"} &middot; {m.instructions || "No instructions"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={PillIcon} message="No active medications" />
                                )}
                            </Card>
                        )}

                        {/* Patient Education */}
                        {isFeatureEnabled("education") && (
                            <Card
                                title="Patient Education"
                                action={{ label: "View all", onClick: () => router.push("/education") }}
                            >
                                {educationTopics.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {educationTopics.slice(0, 4).map((t: any) => (
                                            <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                                                    <EduIcon />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{t.title}</p>
                                                    <p className="text-xs text-gray-500">{t.category}{t.assigned ? " \u00b7 Assigned" : ""}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={EduIcon}
                                        message="No topics assigned yet"
                                        action={{ label: "Browse topics", onClick: () => router.push("/education") }}
                                    />
                                )}
                            </Card>
                        )}

                        {/* Medical Reports & Documents */}
                        {isFeatureEnabled("documents") && (
                            <Card
                                title="Medical Reports & Documents"
                                action={{ label: "View all", onClick: () => router.push("/documents") }}
                            >
                                {documents.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {documents.slice(0, 4).map((d: any) => (
                                            <div key={d.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                                    <DocIcon />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{d.fileName}</p>
                                                    <p className="text-xs text-gray-500">{d.category}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={DocIcon} message="No documents available" />
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Right 2 cols */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Vitals Snapshot */}
                        {isFeatureEnabled("vitals") && (
                            <Card
                                title="Latest Vitals"
                                action={{ label: "View all", onClick: () => router.push("/vitals") }}
                            >
                                {vitals.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {vitals.map((v) => (
                                            <div key={v.type} className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{v.type}</p>
                                                <p className="text-lg font-bold text-gray-900 mt-0.5">
                                                    {v.value}
                                                    {v.unit && <span className="text-xs font-normal text-gray-500 ml-1">{v.unit}</span>}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={HeartIcon} message="No recent vitals" />
                                )}
                            </Card>
                        )}

                        {/* Quick Links */}
                        <Card title="Quick Links">
                            <div className="grid grid-cols-2 gap-2">
                                {QUICK_LINKS.filter((l) => isFeatureEnabled(l.feature)).map((l) => (
                                    <button
                                        key={l.feature}
                                        onClick={() => router.push(l.href)}
                                        className="flex items-center gap-2.5 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${l.bg}`}>
                                            <l.icon />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{l.label}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* Profile Summary */}
                        <Card title="Your Profile">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                    {firstName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{firstName}</p>
                                    <p className="text-xs text-gray-500">{email || "No email on file"}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push("/demographics")}
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                View &amp; edit profile
                            </button>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

/* ───── sub-components ───── */

const COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-700",   ring: "ring-blue-200" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200" },
    green:  { bg: "bg-green-50",  text: "text-green-700",  ring: "ring-green-200" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
};

function StatCard({ label, value, sub, color, onClick }: {
    label: string; value: number; sub: string; color: string; onClick?: () => void;
}) {
    const c = COLORS[color] || COLORS.blue;
    return (
        <button
            onClick={onClick}
            className={`${c.bg} rounded-xl p-4 text-left hover:ring-2 ${c.ring} transition-all group`}
        >
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${c.text} mt-1`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{sub}</p>
        </button>
    );
}

function Card({ title, action, children }: {
    title: string;
    action?: { label: string; onClick: () => void };
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                {action && (
                    <button
                        onClick={action.onClick}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                        {action.label} &rarr;
                    </button>
                )}
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    const s = status.toLowerCase();
    const cls =
        s === "confirmed" || s === "checked_in" ? "bg-green-100 text-green-700" :
        s === "cancelled" || s === "no_show" ? "bg-red-100 text-red-700" :
        "bg-gray-100 text-gray-600";
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{status}</span>;
}

function EmptyState({ icon: Icon, message, action }: {
    icon: React.FC; message: string; action?: { label: string; onClick: () => void };
}) {
    return (
        <div className="text-center py-6">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <Icon />
            </div>
            <p className="text-sm text-gray-500">{message}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

/* ───── icons ───── */

const CalendarIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
);
const PillIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
);
const HeartIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
);

/* ───── quick links ───── */

const LabIcon = () => (
    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
    </svg>
);
const DocIcon = () => (
    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const AllergyIcon = () => (
    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);
const EduIcon = () => (
    <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
    </svg>
);
const BillingIcon = () => (
    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);
const InsuranceIcon = () => (
    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
);

const QUICK_LINKS = [
    { feature: "labs",        label: "Lab Results",    href: "/labs",        icon: LabIcon,       bg: "bg-indigo-100" },
    { feature: "documents",   label: "Documents",      href: "/documents",   icon: DocIcon,       bg: "bg-teal-100" },
    { feature: "allergies",   label: "Allergies",      href: "/allergies",   icon: AllergyIcon,   bg: "bg-amber-100" },
    { feature: "education",   label: "Education",      href: "/education",   icon: EduIcon,       bg: "bg-sky-100" },
    { feature: "billing",     label: "Billing",        href: "/billing",     icon: BillingIcon,   bg: "bg-emerald-100" },
    { feature: "insurance",   label: "Insurance",      href: "/insurance",   icon: InsuranceIcon,  bg: "bg-blue-100" },
];
