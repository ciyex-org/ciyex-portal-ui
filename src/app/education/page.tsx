"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { BookOpen, AlertCircle, X, Globe, CheckCircle2 } from "lucide-react";

type Topic = { id: string; title: string; summary: string; category: string; language: string; readingLevel: string; content: string; fhirId?: string };
type Assignment = { id: string; patientId: string; patientName: string; notes: string; delivered: boolean; assignedDate: string; topic: Topic };

export default function PatientEducationPage() {
    const [mounted, setMounted] = useState(false);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selected, setSelected] = useState<Topic | null>(null);
    const [viewMode, setViewMode] = useState<"assigned" | "all">("assigned");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const loadTopics = useCallback(async () => {
        try {
            const res = await fetchWithAuth("/api/patient-education?page=0&size=100");
            if (!res.ok) return;
            const response = await res.json();
            const data = response.data;
            const rawList = Array.isArray(data) ? data : (data?.content || []);
            // Map EducationMaterialDto to expected Topic shape
            const mapped = rawList.map((m: any) => ({
                id: String(m.id),
                title: m.title || "Untitled",
                summary: m.content ? m.content.substring(0, 200) : "",
                category: m.category || "General",
                language: m.language || "en",
                readingLevel: m.audience || "",
                content: m.content || m.externalUrl || "",
                fhirId: m.fhirId,
            }));
            setTopics(mapped);
        } catch { /* endpoint may not exist yet */ }
    }, []);

    const loadAssignments = useCallback(async () => {
        if (!mounted) return;
        try {
            const res = await fetchWithAuth("/api/portal/patient-education-assignments/my-assignments");
            if (!res.ok) return;
            const response = await res.json();
            const raw = Array.isArray(response.data) ? response.data : [];
            // Map PatientEducationAssignmentDto to expected Assignment shape
            const mapped = raw.map((a: any) => ({
                id: String(a.id),
                patientId: String(a.patientId || ""),
                patientName: a.patientName || "",
                notes: a.notes || "",
                delivered: a.status === "completed" || a.status === "viewed",
                assignedDate: a.assignedDate || a.createdAt || "",
                topic: a.topic || a.educationTopic || a.topicDetails || a.patientEducationTopic || {
                    id: String(a.materialId || a.id),
                    title: a.materialTitle || "Education Material",
                    summary: a.notes || "",
                    category: a.materialCategory || "General",
                    language: "en",
                    readingLevel: "",
                    content: "",
                },
            }));
            setAssignments(mapped);
        } catch { /* endpoint may not exist yet */ }
    }, [mounted]);

    useEffect(() => { if (mounted) { loadTopics(); loadAssignments(); } }, [mounted, loadTopics, loadAssignments]);

    const assignedTopicIds = new Set(assignments.map((a) => a.topic?.id || (a as any).topicId).filter(Boolean));
    const displayTopics = viewMode === "assigned"
        ? assignments.map((a) => a.topic || ((a as any).topicId && topics.find((t) => t.id === (a as any).topicId)) || null).filter(Boolean) as Topic[]
        : topics;

    if (!mounted) {
        return <AdminLayout><div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div></AdminLayout>;
    }

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Patient Education</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Learn about your health and wellness</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-0.5 flex">
                        <button
                            onClick={() => setViewMode("assigned")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "assigned" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            My Topics ({assignments.length})
                        </button>
                        <button
                            onClick={() => setViewMode("all")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "all" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            All Topics ({topics.length})
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Topics Grid */}
                {displayTopics.length === 0 ? (
                    <div className="text-center py-16">
                        <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">
                            {viewMode === "assigned" ? "No topics assigned yet" : "No topics available"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {viewMode === "assigned" ? "Your healthcare provider will assign educational materials as needed." : "Check back later for educational content."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayTopics.map((topic) => {
                            const assignment = assignments.find((a) => a.topic?.id === topic.id);
                            return (
                                <div key={topic.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{topic.category}</span>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <Globe className="h-3 w-3" /> {topic.language}
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-1">{topic.title}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{topic.summary}</p>

                                        {assignment && (
                                            <div className="flex items-start gap-1.5 bg-green-50 rounded-lg p-2 mb-3">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-medium text-green-800">Assigned by your provider</p>
                                                    {assignment.assignedDate && (
                                                        <p className="text-xs text-green-700 mt-0.5">
                                                            {new Date(assignment.assignedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                        </p>
                                                    )}
                                                    {assignment.notes && <p className="text-xs text-green-700 mt-0.5">{assignment.notes}</p>}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">{topic.readingLevel}</span>
                                            <button
                                                onClick={() => setSelected(topic)}
                                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                Read Content
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Content Drawer */}
            {selected && (
                <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
                    <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-5 z-10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{selected.category}</span>
                                        <span className="text-xs text-gray-400">{selected.readingLevel} &middot; {selected.language}</span>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                                    {selected.summary && <p className="text-sm text-gray-500 mt-1">{selected.summary}</p>}
                                </div>
                                <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.content }} />
                        </div>
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center">
                            {assignedTopicIds.has(selected.id) && (
                                <div className="flex items-center gap-1.5 text-green-600 text-sm">
                                    <CheckCircle2 className="h-4 w-4" /> Assigned by your provider
                                </div>
                            )}
                            <button onClick={() => setSelected(null)} className="ml-auto px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
