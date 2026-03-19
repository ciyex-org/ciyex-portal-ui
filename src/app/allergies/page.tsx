"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { AlertTriangle, FileText, Plus, Trash2, Pencil, Save, X, AlertCircle } from "lucide-react";

type Allergy = { id: number; substance: string; reaction: string; severity: "Mild" | "Moderate" | "Severe" };
type HistoryItem = { id: number; type: "Condition" | "Surgery" | "Family"; description: string; year?: string };

function severityBadge(s: string) {
    const cls = s === "Severe" ? "bg-red-100 text-red-700" : s === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s}</span>;
}

function typeBadge(t: string) {
    const cls = t === "Condition" ? "bg-blue-100 text-blue-700" : t === "Surgery" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700";
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{t}</span>;
}

export default function AllergiesPage() {
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 4000); return () => clearTimeout(t); } }, [alert]);

    useEffect(() => { loadAllergies(); loadHistory(); }, []);

    async function loadAllergies() {
        try {
            const res = await fetchWithAuth("/api/portal/allergies");
            const data = await res.json();
            setAllergies((data.data || []).map((i: any) => {
            // Extract reaction text — FHIR returns reaction as array of objects
            let reaction = "";
            if (typeof i.reaction === "string") {
                reaction = i.reaction;
            } else if (Array.isArray(i.reaction)) {
                reaction = i.reaction.map((r: any) =>
                    (r.manifestation || []).map((m: any) => m.text || m.display || (m.coding?.[0]?.display) || "").filter(Boolean).join(", ")
                ).filter(Boolean).join("; ") || "";
            }
            if (!reaction) reaction = (typeof i.reactionManifestations === "string" ? i.reactionManifestations : "") || (typeof i.manifestation === "string" ? i.manifestation : "") || "";
            // Extract substance — code can also be an object
            const substance = i.allergyName || i.allergy_name || i.substance || (typeof i.code === "string" ? i.code : i.code?.text || i.code?.coding?.[0]?.display || "") || i.name || "";
            return {
                id: i.id,
                substance,
                reaction,
                severity: i.severity || i.criticalityText || i.criticality || "Mild",
            };
        }));
        } catch { setAlert({ type: "error", message: "Failed to load allergies." }); }
    }

    async function loadHistory() {
        try {
            const res = await fetchWithAuth("/api/portal/history");
            const data = await res.json();
            const rawItems = data.data || [];
            // FHIR history config uses QuestionnaireResponse with keys like smokingStatus, alcoholUse, etc.
            // Also handle traditional record format with medical_condition/description
            const items: HistoryItem[] = [];
            if (Array.isArray(rawItems) && rawItems.length > 0) {
                for (const i of rawItems) {
                    // Check for FHIR QuestionnaireResponse format (flat key-value)
                    if (i.smokingStatus || i.alcoholUse || i.exerciseFrequency || i.additionalHistory ||
                        i.fatherHistory || i.motherHistory || i.siblingsHistory || i.offspringHistory) {
                        if (i.smokingStatus) items.push({ id: items.length + 1, type: "Condition", description: `Smoking: ${i.smokingStatus}` });
                        if (i.alcoholUse) items.push({ id: items.length + 1, type: "Condition", description: `Alcohol use: ${i.alcoholUse}` });
                        if (i.exerciseFrequency) items.push({ id: items.length + 1, type: "Condition", description: `Exercise: ${i.exerciseFrequency}` });
                        if (i.additionalHistory) items.push({ id: items.length + 1, type: "Condition", description: i.additionalHistory });
                        if (i.fatherHistory) items.push({ id: items.length + 1, type: "Family", description: `Father: ${i.fatherHistory}` });
                        if (i.motherHistory) items.push({ id: items.length + 1, type: "Family", description: `Mother: ${i.motherHistory}` });
                        if (i.siblingsHistory) items.push({ id: items.length + 1, type: "Family", description: `Siblings: ${i.siblingsHistory}` });
                        if (i.offspringHistory) items.push({ id: items.length + 1, type: "Family", description: `Offspring: ${i.offspringHistory}` });
                    } else {
                        // Traditional record format — avoid "undefined" in description
                        const condition = i.medical_condition || i.conditionName || i.condition || i.diagnosis || "";
                        const desc = i.description || i.notes || i.comment || i.name || "";
                        const fullDesc = condition && desc ? `${condition}: ${desc}` : condition || desc || "";
                        const rawDate = i.date_occurred || i.onset_date || i.onsetDate || i.dateOccurred || "";
                        let year = "";
                        if (rawDate) { try { year = new Date(rawDate).getFullYear().toString(); } catch { year = ""; } }
                        items.push({
                            id: i.id || items.length + 1,
                            type: i.history_type || i.historyType || i.type || "Condition",
                            description: fullDesc,
                            year,
                        });
                    }
                }
            }
            setHistory(items);
        } catch { setAlert({ type: "error", message: "Failed to load history." }); }
    }

    async function handleSave() {
        try {
            await fetchWithAuth("/api/portal/allergies", { method: "POST", body: JSON.stringify(allergies) });
            await fetchWithAuth("/api/portal/history", { method: "POST", body: JSON.stringify(history) });
            setEditMode(false);
            setAlert({ type: "success", message: "Allergies and history updated successfully." });
        } catch { setAlert({ type: "error", message: "Failed to save changes." }); }
    }

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Health Profile</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Manage your allergies and medical history</p>
                    </div>
                    {!editMode ? (
                        <button onClick={() => setEditMode(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            <Pencil className="h-4 w-4" /> Edit
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                                <Save className="h-4 w-4" /> Save
                            </button>
                            <button onClick={() => setEditMode(false)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Allergies */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-red-50/50 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <h2 className="text-sm font-semibold text-gray-900">Allergies</h2>
                            <span className="text-xs text-gray-500 ml-auto">{allergies.length} recorded</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {allergies.length === 0 && !editMode ? (
                                <div className="text-center py-8">
                                    <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No allergies recorded</p>
                                </div>
                            ) : (
                                allergies.map((a) => (
                                    <div key={a.id} className="border border-gray-200 rounded-lg p-3">
                                        {editMode ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <input className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Substance" value={a.substance}
                                                        onChange={(e) => setAllergies((p) => p.map((x) => x.id === a.id ? { ...x, substance: e.target.value } : x))} />
                                                    <button onClick={() => setAllergies((p) => p.filter((x) => x.id !== a.id))} className="ml-2 p-1 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                                <input className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Reaction" value={a.reaction}
                                                    onChange={(e) => setAllergies((p) => p.map((x) => x.id === a.id ? { ...x, reaction: e.target.value } : x))} />
                                                <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={a.severity}
                                                    onChange={(e) => setAllergies((p) => p.map((x) => x.id === a.id ? { ...x, severity: e.target.value as Allergy["severity"] } : x))}>
                                                    <option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-gray-900">{a.substance || "Unknown"}</span>
                                                    {severityBadge(a.severity)}
                                                </div>
                                                <p className="text-xs text-gray-500">Reaction: {a.reaction || "Not specified"}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {editMode && (
                                <button onClick={() => setAllergies((p) => [...p, { id: Date.now(), substance: "", reaction: "", severity: "Mild" }])}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-dashed border-gray-300">
                                    <Plus className="h-4 w-4" /> Add Allergy
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Medical History */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <h2 className="text-sm font-semibold text-gray-900">Medical History</h2>
                            <span className="text-xs text-gray-500 ml-auto">{history.length} recorded</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {history.length === 0 && !editMode ? (
                                <div className="text-center py-8">
                                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No medical history recorded</p>
                                </div>
                            ) : (
                                history.map((h) => (
                                    <div key={h.id} className="border border-gray-200 rounded-lg p-3">
                                        {editMode ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <select className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" value={h.type}
                                                        onChange={(e) => setHistory((p) => p.map((x) => x.id === h.id ? { ...x, type: e.target.value as HistoryItem["type"] } : x))}>
                                                        <option value="Condition">Condition</option><option value="Surgery">Surgery</option><option value="Family">Family History</option>
                                                    </select>
                                                    <button onClick={() => setHistory((p) => p.filter((x) => x.id !== h.id))} className="ml-2 p-1 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                                <input className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Description" value={h.description}
                                                    onChange={(e) => setHistory((p) => p.map((x) => x.id === h.id ? { ...x, description: e.target.value } : x))} />
                                                <input className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Year" value={h.year || ""}
                                                    onChange={(e) => setHistory((p) => p.map((x) => x.id === h.id ? { ...x, year: e.target.value } : x))} />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {typeBadge(h.type)}
                                                    {h.year && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{h.year}</span>}
                                                </div>
                                                <p className="text-sm text-gray-700">{h.description || "No description"}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {editMode && (
                                <button onClick={() => setHistory((p) => [...p, { id: Date.now(), type: "Condition", description: "", year: "" }])}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-dashed border-gray-300">
                                    <Plus className="h-4 w-4" /> Add History
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Important notice */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-amber-800">Important Health Information</h3>
                        <p className="text-xs text-amber-700 mt-1">Please keep this information up to date. Accurate allergy and medical history helps your providers deliver the best possible care.</p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
