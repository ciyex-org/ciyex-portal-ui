"use client";

import AdminLayout from "@/app/(admin)/layout";
import { useDocuments } from "@/hooks/useDocuments";
import { FileText, FolderOpen, Lock, AlertCircle, Download, Eye, Trash2 } from "lucide-react";

function fmtDate(d?: string) {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch { return "—"; }
}

function categoryBadge(cat?: string) {
    const c = (cat || "").toLowerCase();
    const cls =
        c === "clinical" ? "bg-blue-100 text-blue-700" :
        c === "lab" ? "bg-green-100 text-green-700" :
        c === "imaging" ? "bg-purple-100 text-purple-700" :
        c === "insurance" ? "bg-amber-100 text-amber-700" :
        "bg-gray-100 text-gray-600";
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{cat || "Other"}</span>;
}

export default function DocumentsPage() {
    const { documents, loading, error, downloadDocument, viewDocument, deleteDocument } = useDocuments();

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Medical Documents</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Access your medical records, test results, and documents</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-800">Unable to load documents</h3>
                            <p className="text-sm text-amber-700 mt-1">Please contact your healthcare provider if you believe you should have access.</p>
                        </div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-16">
                        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900">No documents found</h3>
                        <p className="text-sm text-gray-500 mt-1">Your medical documents will appear here once uploaded by your provider.</p>
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500">Total Documents</p>
                                    <p className="text-lg font-bold text-gray-900">{documents.length}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg"><FolderOpen className="h-5 w-5 text-green-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500">Categories</p>
                                    <p className="text-lg font-bold text-gray-900">{new Set(documents.map((d: any) => d.category)).size}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className="p-2 bg-purple-50 rounded-lg"><Lock className="h-5 w-5 text-purple-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500">Encrypted</p>
                                    <p className="text-lg font-bold text-gray-900">{documents.filter((d: any) => d.encrypted).length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50/50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Security</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {documents.map((doc: any, i: number) => (
                                            <tr key={doc.id || i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-medium text-gray-900">{doc.fileName}</span>
                                                    {doc.description && <div className="text-xs text-gray-400 mt-0.5">{doc.description}</div>}
                                                </td>
                                                <td className="px-4 py-3">{categoryBadge(doc.category)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-700">{fmtDate(doc.createdDate)}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {doc.encrypted ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            <Lock className="h-3 w-3" /> Encrypted
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Standard</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => viewDocument(doc.id)}
                                                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors" title="View"
                                                        ><Eye className="h-4 w-4" /></button>
                                                        <button
                                                            onClick={() => downloadDocument(doc.id)}
                                                            className="p-1 text-green-600 hover:text-green-800 transition-colors" title="Download"
                                                        ><Download className="h-4 w-4" /></button>
                                                        <button
                                                            onClick={async () => { if (window.confirm("Delete this document?")) await deleteDocument(doc.id); }}
                                                            className="p-1 text-red-500 hover:text-red-700 transition-colors" title="Delete"
                                                        ><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 text-right">
                                {documents.length} document{documents.length !== 1 ? "s" : ""}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
