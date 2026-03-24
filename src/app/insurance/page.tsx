"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useInsurance } from "@/hooks/useInsurance";
import { Shield, Pencil, Archive, Plus, X, Upload, User, Building2, AlertCircle, Save, Check, CreditCard, Phone, MapPin } from "lucide-react";

type InsuranceCompany = { id: number; name: string; address?: string; city?: string; state?: string; postalCode?: string; country?: string; payerId?: string; phone?: string };

type InsurancePolicy = {
    providerId: number | null; planName: string; effectiveDate: string; effectiveDateEnd: string;
    policyNumber: string; groupNumber: string; subscriberId: string; copay: string;
    secondaryMedicareType: "N/A" | "Part A" | "Part B";
    byholderName: string; byholderRelation: string; subscriberEmployer: string;
    subscriberAddressLine1: string; subscriberAddressLine2: string; subscriberCity: string;
    subscriberState: string; subscriberZipCode: string; subscriberCountry: string; subscriberPhone: string;
    cardFrontUrl: string; cardBackUrl: string; cardFrontFile?: File | null; cardBackFile?: File | null;
};

const initialPolicy: InsurancePolicy = {
    providerId: null, planName: "", effectiveDate: "", effectiveDateEnd: "", policyNumber: "", groupNumber: "",
    subscriberId: "", copay: "", secondaryMedicareType: "N/A", byholderName: "", byholderRelation: "",
    subscriberEmployer: "", subscriberAddressLine1: "", subscriberAddressLine2: "", subscriberCity: "",
    subscriberState: "", subscriberZipCode: "", subscriberCountry: "USA", subscriberPhone: "",
    cardFrontUrl: "", cardBackUrl: "", cardFrontFile: null, cardBackFile: null,
};

type Level = "primary" | "secondary" | "tertiary";

type CoverageResponse = {
    id: number; coverageType: string; planName: string; policyNumber: string; groupNumber?: string;
    coverageStartDate: string; coverageEndDate: string; copayAmount?: number; insuranceCompany: InsuranceCompany;
    byholderName?: string; byholderRelation?: string; subscriberEmployer?: string;
    subscriberAddressLine1?: string; subscriberAddressLine2?: string; subscriberCity?: string;
    subscriberState?: string; subscriberZipCode?: string; subscriberCountry?: string; subscriberPhone?: string;
    cardFrontUrl?: string; cardBackUrl?: string;
};

type CoverageIds = Record<Level, number | null>;
type PatientInfo = { name?: string; firstName?: string; lastName?: string; mrn?: string; dob?: string; ehrPatientId?: number };

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";

function Field({ label, children, required, span2 }: { label: string; children: React.ReactNode; required?: boolean; span2?: boolean }) {
    return (
        <div className={span2 ? "md:col-span-2" : ""}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && " *"}</label>
            {children}
        </div>
    );
}

function ReadField({ label, value }: { label: string; value?: string }) {
    return (
        <div>
            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
            <span className="text-sm text-gray-900 mt-0.5 block">{value || "\u2014"}</span>
        </div>
    );
}

export default function InsurancePage() {
    const { coverages, loading, error, refetch } = useInsurance();
    const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
    const [policies, setPolicies] = useState<Record<Level, InsurancePolicy>>({
        primary: { ...initialPolicy }, secondary: { ...initialPolicy }, tertiary: { ...initialPolicy },
    });
    const [coverageIds, setCoverageIds] = useState<CoverageIds>({ primary: null, secondary: null, tertiary: null });
    const [editLevel, setEditLevel] = useState<Level | null>(null);
    const [patientInfo, setPatientInfo] = useState<PatientInfo>({});
    const [alert, setAlert] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
    const [newCompany, setNewCompany] = useState<Partial<InsuranceCompany>>({ name: "", address: "", city: "", state: "", postalCode: "", country: "USA", payerId: "", phone: "" });
    const [cardPreviews, setCardPreviews] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 5000); return () => clearTimeout(t); } }, [alert]);

    useEffect(() => {
        async function loadCompanies() {
            try {
                const res = await fetchWithAuth("/api/insurance-companies");
                const data = await res.json();
                setCompanies(data.data ?? data ?? []);
            } catch { /* ignore */ }
        }
        loadCompanies();
    }, []);

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetchWithAuth("/api/portal/patient/me");
                if (!res.ok) return;
                const data = await res.json();
                if (data?.data) {
                    const dto = data.data;
                    const firstName = dto.firstName || dto.givenName || undefined;
                    const lastName = dto.lastName || dto.familyName || undefined;
                    const displayName = dto.fullName || dto.name || dto.displayName || (firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined);
                    setPatientInfo({ name: displayName, firstName, lastName, mrn: dto.mrn || dto.id, dob: dto.dob || dto.birthDate, ehrPatientId: dto.ehrPatientId || dto.ehr_patient_id });
                }
            } catch { /* ignore */ }
        }
        loadProfile();
    }, []);

    useEffect(() => {
        if (coverages.length > 0) {
            const existingPolicies: Record<Level, InsurancePolicy> = { primary: { ...initialPolicy }, secondary: { ...initialPolicy }, tertiary: { ...initialPolicy } };
            const existingIds: CoverageIds = { primary: null, secondary: null, tertiary: null };
            coverages.forEach((coverage: CoverageResponse) => {
                const level = (coverage.coverageType?.toLowerCase() || (coverage as any).insuranceType?.toLowerCase()) as Level;
                if (level && existingPolicies[level]) {
                    existingPolicies[level] = {
                        ...existingPolicies[level], providerId: coverage.insuranceCompany?.id || null,
                        planName: coverage.planName || "", effectiveDate: coverage.coverageStartDate || "",
                        effectiveDateEnd: coverage.coverageEndDate || "", policyNumber: coverage.policyNumber || "",
                        groupNumber: coverage.groupNumber || "", subscriberId: coverage.policyNumber || "",
                        copay: coverage.copayAmount ? coverage.copayAmount.toString() : "", secondaryMedicareType: "N/A",
                        byholderName: coverage.byholderName || "", byholderRelation: coverage.byholderRelation || "",
                        subscriberEmployer: coverage.subscriberEmployer || "", subscriberAddressLine1: coverage.subscriberAddressLine1 || "",
                        subscriberAddressLine2: coverage.subscriberAddressLine2 || "", subscriberCity: coverage.subscriberCity || "",
                        subscriberState: coverage.subscriberState || "", subscriberZipCode: coverage.subscriberZipCode || "",
                        subscriberCountry: coverage.subscriberCountry || "USA", subscriberPhone: coverage.subscriberPhone || "",
                        cardFrontUrl: coverage.cardFrontUrl || "", cardBackUrl: coverage.cardBackUrl || "",
                        cardFrontFile: null, cardBackFile: null,
                    };
                    existingIds[level] = coverage.id;
                }
            });
            setPolicies(existingPolicies);
            setCoverageIds(existingIds);
        }
    }, [coverages]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, level: Level) => {
        const { name, value } = e.target;
        // Group number and policy number (member ID) must be alphanumeric only
        const sanitized = (name === "groupNumber" || name === "policyNumber") ? value.replace(/[^a-zA-Z0-9]/g, "") : value;
        setPolicies((prev) => ({ ...prev, [level]: { ...prev[level], [name]: sanitized } }));
    };

    const handleSubscriberRelationChange = (level: Level, relation: string) => {
        setPolicies((prev) => {
            const current = prev[level];
            const updated: InsurancePolicy = { ...current, byholderRelation: relation };
            if (relation === "Self") {
                const fullName = patientInfo.name || [patientInfo.firstName, patientInfo.lastName].filter(Boolean).join(" ");
                updated.byholderName = fullName || current.byholderName;
            }
            return { ...prev, [level]: updated };
        });
    };

    const uploadInsuranceCards = async (level: Level, coverageId: number, policy: InsurancePolicy) => {
        try {
            if (policy.cardFrontFile) {
                const fd = new FormData();
                fd.append("file", policy.cardFrontFile);
                await fetchWithAuth(`/api/coverages/${coverageId}/card/front`, { method: "POST", body: fd });
            }
            if (policy.cardBackFile) {
                const fd = new FormData();
                fd.append("file", policy.cardBackFile);
                await fetchWithAuth(`/api/coverages/${coverageId}/card/back`, { method: "POST", body: fd });
            }
        } catch { /* card upload failures don't block save */ }
    };

    const handleSave = async (level: Level) => {
        try {
            const policy = policies[level];
            const coverageId = coverageIds[level];
            if (level === "secondary" && !coverageIds.primary) { setAlert({ type: "warning", message: "Please add primary insurance before adding secondary coverage." }); return; }
            if (level === "tertiary" && !coverageIds.secondary) { setAlert({ type: "warning", message: "Please add secondary insurance before adding tertiary coverage." }); return; }
            if (policy.effectiveDate && policy.effectiveDateEnd && new Date(policy.effectiveDateEnd) < new Date(policy.effectiveDate)) {
                setAlert({ type: "error", message: "Expiration date must be after the effective date." }); return;
            }
            const coverageData = {
                coverageType: level.toUpperCase(), planName: policy.planName, policyNumber: policy.policyNumber,
                groupNumber: policy.groupNumber, coverageStartDate: policy.effectiveDate, coverageEndDate: policy.effectiveDateEnd,
                copayAmount: policy.copay ? parseFloat(policy.copay) : null,
                insuranceCompany: { id: policy.providerId },
                byholderName: policy.byholderName, byholderRelation: policy.byholderRelation,
                subscriberEmployer: policy.subscriberEmployer, subscriberAddressLine1: policy.subscriberAddressLine1,
                subscriberAddressLine2: policy.subscriberAddressLine2, subscriberCity: policy.subscriberCity,
                subscriberState: policy.subscriberState, subscriberZipCode: policy.subscriberZipCode,
                subscriberCountry: policy.subscriberCountry, subscriberPhone: policy.subscriberPhone,
                secondaryMedicareType: level === "secondary" ? policy.secondaryMedicareType : "N/A",
            };
            const method = coverageId ? "PUT" : "POST";
            const url = coverageId
                ? `/api/portal/insurance/${coverageId}`
                : "/api/portal/insurance";
            const response = await fetchWithAuth(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(coverageData) });
            if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to ${coverageId ? "update" : "create"} coverage: ${errorText}`); }
            const result = await response.json();
            const savedCoverageId = coverageId || result.data?.id;
            if (!coverageId && result.data?.id) setCoverageIds((prev) => ({ ...prev, [level]: result.data.id }));
            await uploadInsuranceCards(level, savedCoverageId, policy);
            setAlert({ type: "success", message: `Your ${level} insurance was ${coverageId ? "updated" : "added"} successfully.` });
            setEditLevel(null);
            await refetch();
        } catch (err) {
            setAlert({ type: "error", message: err instanceof Error ? err.message : "Failed to save insurance information." });
        }
    };

    const handleArchiveInsurance = async (level: Level) => {
        const coverageId = coverageIds[level];
        if (!coverageId) { setAlert({ type: "warning", message: `No ${level} insurance found to archive.` }); return; }
        if (!window.confirm(`Are you sure you want to archive your ${level} insurance coverage?`)) return;
        try {
            const response = await fetchWithAuth(`/api/coverages/${coverageId}/archive`, { method: "PUT" });
            if (!response.ok) throw new Error(`Failed to archive coverage: ${response.statusText}`);
            setPolicies((prev) => ({ ...prev, [level]: { ...initialPolicy } }));
            setCoverageIds((prev) => ({ ...prev, [level]: null }));
            setAlert({ type: "success", message: `Your ${level} insurance was archived successfully.` });
            await refetch();
        } catch (err) {
            setAlert({ type: "error", message: err instanceof Error ? err.message : "Failed to archive insurance." });
        }
    };

    const handleCardFileChange = (level: Level, side: "front" | "back", file: File | null) => {
        if (!file) return;
        const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
        if (!validTypes.includes(file.type)) { setAlert({ type: "error", message: "Please upload a PNG, JPEG, or PDF file." }); return; }
        if (file.size > 5 * 1024 * 1024) { setAlert({ type: "error", message: "File size must be less than 5MB." }); return; }
        setPolicies((prev) => ({ ...prev, [level]: { ...prev[level], [side === "front" ? "cardFrontFile" : "cardBackFile"]: file } }));
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => setCardPreviews((prev) => ({ ...prev, [side]: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleAddCompany = async () => {
        if (!newCompany.name || !newCompany.address || !newCompany.city || !newCompany.state || !newCompany.postalCode || !newCompany.payerId) {
            setAlert({ type: "error", message: "Please fill in all required fields." }); return;
        }
        try {
            const response = await fetchWithAuth("/api/insurance-companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCompany) });
            if (!response.ok) throw new Error("Failed to add insurance company");
            const result = await response.json();
            const addedCompany = result.data || result;
            setCompanies((prev) => [...prev, addedCompany]);
            if (editLevel) setPolicies((prev) => ({ ...prev, [editLevel]: { ...prev[editLevel], providerId: addedCompany.id } }));
            setShowAddCompanyModal(false);
            setNewCompany({ name: "", address: "", city: "", state: "", postalCode: "", country: "USA", payerId: "", phone: "" });
            setAlert({ type: "success", message: `${addedCompany.name} has been added.` });
        } catch {
            setAlert({ type: "error", message: "Failed to add insurance company." });
        }
    };

    const fmtDate = (d?: string) => {
        if (!d) return "\u2014";
        try { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch { return d; }
    };

    const levelColors: Record<Level, { bg: string; border: string; text: string; badge: string }> = {
        primary: { bg: "bg-blue-50/50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
        secondary: { bg: "bg-amber-50/50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
        tertiary: { bg: "bg-purple-50/50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
    };

    const renderCard = (level: Level, title: string) => {
        const p = policies[level];
        const hasCoverage = coverageIds[level] !== null;
        const isConfigured = hasCoverage || (p.providerId && p.planName);
        const colors = levelColors[level];

        if (editLevel === level) return renderForm(level, title);

        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className={`px-5 py-3 border-b border-gray-100 ${colors.bg} flex items-center gap-2`}>
                    <Shield className={`h-4 w-4 ${colors.text}`} />
                    <h2 className="text-sm font-semibold text-gray-900">{title} Insurance</h2>
                    {isConfigured && <span className={`ml-auto inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>Active</span>}
                </div>

                {isConfigured ? (
                    <div className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <ReadField label="Insurance Provider" value={
                                (coverages as any[]).find((c) => (c.insuranceType?.toLowerCase() === level || c.coverageType?.toLowerCase() === level))?.payerName
                                || companies.find((c) => c.id === p.providerId)?.name
                                || (coverages as any[]).find((c) => (c.insuranceType?.toLowerCase() === level || c.coverageType?.toLowerCase() === level))?.insuranceCompany?.name
                            } />
                            <ReadField label="Plan Name" value={p.planName} />
                            <ReadField label="Member ID" value={p.policyNumber} />
                            <ReadField label="Group Number" value={p.groupNumber} />
                            <ReadField label="Copay" value={p.copay ? `$${p.copay}` : undefined} />
                            <div>
                                <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                                    <span className="text-sm text-green-600 font-medium">Active</span>
                                </div>
                            </div>
                            <ReadField label="Effective Date" value={fmtDate(p.effectiveDate)} />
                            <ReadField label="Expiration Date" value={fmtDate(p.effectiveDateEnd)} />
                            {p.byholderName && <ReadField label="Subscriber Name" value={p.byholderName} />}
                            {p.byholderRelation && <ReadField label="Relationship" value={p.byholderRelation} />}
                            {p.subscriberPhone && <ReadField label="Subscriber Phone" value={p.subscriberPhone} />}
                            {p.subscriberEmployer && <ReadField label="Employer" value={p.subscriberEmployer} />}
                        </div>
                        {(p.subscriberAddressLine1 || p.subscriberCity) && (
                            <div className="mb-4">
                                <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Subscriber Address</span>
                                <span className="text-sm text-gray-900">
                                    {[p.subscriberAddressLine1, p.subscriberAddressLine2, [p.subscriberCity, p.subscriberState, p.subscriberZipCode].filter(Boolean).join(", ")].filter(Boolean).join(", ")}
                                </span>
                            </div>
                        )}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                            <button onClick={() => { setEditLevel(level); setCardPreviews({ front: null, back: null }); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button onClick={() => handleArchiveInsurance(level)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                                <Archive className="h-3.5 w-3.5" /> Archive
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-4">No {title.toLowerCase()} insurance has been added yet.</p>
                        <button onClick={() => setEditLevel(level)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                            <Plus className="h-4 w-4" /> Add {title} Insurance
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderForm = (level: Level, title: string) => {
        const p = policies[level];
        const colors = levelColors[level];

        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className={`px-5 py-3 border-b border-gray-100 ${colors.bg} flex items-center gap-2`}>
                    <Shield className={`h-4 w-4 ${colors.text}`} />
                    <h2 className="text-sm font-semibold text-gray-900">Edit {title} Insurance</h2>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(level); }} className="p-5 space-y-6">
                    {/* Coverage Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Insurance Provider" required span2>
                            <div className="flex items-center gap-2">
                                <select name="providerId" value={p.providerId ?? ""} onChange={(e) => handleChange(e, level)} className={`${inputCls} flex-1`} required>
                                    <option value="">Select Insurance Provider</option>
                                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button type="button" onClick={() => { setNewCompany({ name: "", address: "", city: "", state: "", postalCode: "", country: "USA", payerId: "", phone: "" }); setShowAddCompanyModal(true); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                                    <Plus className="h-3.5 w-3.5" /> Add New
                                </button>
                            </div>
                        </Field>
                        <Field label="Plan Name" required>
                            <input type="text" name="planName" placeholder="e.g., PPO Plus, HMO Gold" value={p.planName} onChange={(e) => handleChange(e, level)} className={inputCls} required />
                        </Field>
                        <Field label="Member ID">
                            <input type="text" name="policyNumber" placeholder="Enter member ID (alphanumeric only)" value={p.policyNumber} onChange={(e) => handleChange(e, level)} className={`${inputCls} font-mono`} />
                            {p.policyNumber && !/^[a-zA-Z0-9]+$/.test(p.policyNumber) && (
                                <p className="text-xs text-red-500 mt-1">Policy number must contain only letters and numbers</p>
                            )}
                        </Field>
                        <Field label="Group Number">
                            <input type="text" name="groupNumber" placeholder="Enter group number (alphanumeric only)" value={p.groupNumber} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            {p.groupNumber && !/^[a-zA-Z0-9]+$/.test(p.groupNumber) && (
                                <p className="text-xs text-red-500 mt-1">Group number must contain only letters and numbers</p>
                            )}
                        </Field>
                        <Field label="Copay Amount" required>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                <input type="text" name="copay" placeholder="0.00" value={p.copay} onChange={(e) => handleChange(e, level)} className={`${inputCls} pl-7`} required />
                            </div>
                        </Field>
                        <Field label="Effective Date" required>
                            <input type="date" name="effectiveDate" value={p.effectiveDate} onChange={(e) => handleChange(e, level)} className={inputCls} required />
                        </Field>
                        <Field label="Expiration Date" required>
                            <input type="date" name="effectiveDateEnd" value={p.effectiveDateEnd} onChange={(e) => handleChange(e, level)} className={inputCls} required />
                        </Field>
                        {level === "secondary" && (
                            <Field label="Medicare Type">
                                <select name="secondaryMedicareType" value={p.secondaryMedicareType} onChange={(e) => handleChange(e, level)} className={inputCls}>
                                    <option value="N/A">Not Applicable</option>
                                    <option value="Part A">Medicare Part A</option>
                                    <option value="Part B">Medicare Part B</option>
                                </select>
                            </Field>
                        )}
                    </div>

                    {/* Insurance Card Upload */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center gap-2 mb-3">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <h3 className="text-sm font-semibold text-gray-900">Insurance Card Images</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Upload front and back of your insurance card. PNG, JPEG, or PDF (max 5MB).</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(["front", "back"] as const).map((side) => {
                                const hasFile = side === "front" ? (p.cardFrontUrl || cardPreviews.front) : (p.cardBackUrl || cardPreviews.back);
                                const existingUrl = side === "front" ? p.cardFrontUrl : p.cardBackUrl;
                                return (
                                    <div key={side}>
                                        <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{side} of Card</label>
                                        <input type="file" accept="image/png,image/jpeg,image/jpg,application/pdf" onChange={(e) => handleCardFileChange(level, side, e.target.files?.[0] || null)} className="hidden" id={`card-${side}-${level}`} />
                                        <label htmlFor={`card-${side}-${level}`} className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                            {hasFile ? (
                                                <div className="text-center">
                                                    <Check className="h-6 w-6 text-green-500 mx-auto mb-1" />
                                                    <p className="text-xs text-green-600 font-medium">Card Uploaded</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">Click to replace</p>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                                    <p className="text-xs text-gray-500">Click to upload</p>
                                                </div>
                                            )}
                                        </label>
                                        {existingUrl && <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">View current</a>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subscriber Information */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-blue-600" />
                            <h3 className="text-sm font-semibold text-gray-900">Subscriber Information</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            {level === "primary" ? "The subscriber is the person who owns this policy. Often this is you, but may be a spouse, parent, or guardian." : "The subscriber/policyholder for this coverage level."}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Policyholder Name" span2>
                                <input type="text" name="byholderName" placeholder="Full name as on insurance card" value={p.byholderName} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                            <Field label="Relationship to Patient" required>
                                <select value={p.byholderRelation} onChange={(e) => handleSubscriberRelationChange(level, e.target.value)} className={inputCls} required>
                                    <option value="">Select relationship</option>
                                    <option value="Self">Self</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Child">Child</option>
                                    <option value="Guardian">Legal Guardian</option>
                                    <option value="Other">Other</option>
                                </select>
                            </Field>
                            <Field label="Subscriber Phone">
                                <input type="tel" name="subscriberPhone" placeholder="(555) 123-4567" value={p.subscriberPhone} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                            <Field label="Employer">
                                <input type="text" name="subscriberEmployer" placeholder="Employer name" value={p.subscriberEmployer} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                            <Field label="Address Line 1" span2>
                                <input type="text" name="subscriberAddressLine1" placeholder="Street address" value={p.subscriberAddressLine1} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                            <Field label="Address Line 2" span2>
                                <input type="text" name="subscriberAddressLine2" placeholder="Apt, suite, unit (optional)" value={p.subscriberAddressLine2} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                            <Field label="City">
                                <input type="text" name="subscriberCity" placeholder="City" value={p.subscriberCity} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                            <Field label="State">
                                <input type="text" name="subscriberState" placeholder="CA" maxLength={2} value={p.subscriberState} onChange={(e) => handleChange(e, level)} className={`${inputCls} uppercase`} />
                            </Field>
                            <Field label="Zip Code">
                                <input type="text" name="subscriberZipCode" placeholder="Zip code" value={p.subscriberZipCode} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                            <Field label="Country">
                                <input type="text" name="subscriberCountry" placeholder="Country" value={p.subscriberCountry} onChange={(e) => handleChange(e, level)} className={inputCls} />
                            </Field>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setEditLevel(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                        <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                            <Save className="h-4 w-4" /> Save Insurance
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    if (loading || !mounted) {
        return <AdminLayout><div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div></AdminLayout>;
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-800">Unable to load insurance information</h3>
                            <p className="text-sm text-amber-700 mt-1">Please contact your healthcare provider if you believe you should have access.</p>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Insurance Coverage</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your insurance plans and coverage information</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg"><Shield className="h-5 w-5 text-blue-600" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Total Coverages</p>
                            <p className="text-lg font-bold text-gray-900">{coverages?.length ?? 0}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg"><Building2 className="h-5 w-5 text-green-600" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Primary Plan</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{coverages?.find((c: CoverageResponse) => c.coverageType?.toLowerCase() === "primary")?.planName || "None"}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg"><User className="h-5 w-5 text-purple-600" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Patient</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{patientInfo.name || "\u2014"}</p>
                        </div>
                    </div>
                </div>

                {/* Alert */}
                {alert && (
                    <div className={`flex items-start gap-3 rounded-xl p-4 ${alert.type === "success" ? "bg-green-50 border border-green-200" : alert.type === "warning" ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}`}>
                        <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${alert.type === "success" ? "text-green-600" : alert.type === "warning" ? "text-amber-600" : "text-red-600"}`} />
                        <p className={`text-sm ${alert.type === "success" ? "text-green-700" : alert.type === "warning" ? "text-amber-700" : "text-red-700"}`}>{alert.message}</p>
                    </div>
                )}

                {/* Insurance Levels */}
                <div className="space-y-6">
                    {renderCard("primary", "Primary")}
                    {renderCard("secondary", "Secondary")}
                    {renderCard("tertiary", "Tertiary")}
                </div>
            </div>

            {/* Add Insurance Company Modal */}
            {showAddCompanyModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAddCompanyModal(false); }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                <h3 className="text-base font-semibold text-gray-900">Add Insurance Company</h3>
                            </div>
                            <button onClick={() => setShowAddCompanyModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <Field label="Company Name" required>
                                <input type="text" value={newCompany.name || ""} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} className={inputCls} placeholder="e.g., Blue Cross Blue Shield" />
                            </Field>
                            <Field label="Payer ID" required>
                                <input type="text" value={newCompany.payerId || ""} onChange={(e) => setNewCompany({ ...newCompany, payerId: e.target.value })} className={inputCls} placeholder="e.g., 12345" />
                            </Field>
                            <Field label="Address" required>
                                <input type="text" value={newCompany.address || ""} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} className={inputCls} placeholder="Street address" />
                            </Field>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="City" required>
                                    <input type="text" value={newCompany.city || ""} onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })} className={inputCls} placeholder="City" />
                                </Field>
                                <Field label="State" required>
                                    <input type="text" value={newCompany.state || ""} onChange={(e) => setNewCompany({ ...newCompany, state: e.target.value.toUpperCase() })} className={`${inputCls} uppercase`} placeholder="ST" maxLength={2} />
                                </Field>
                                <Field label="Postal Code" required>
                                    <input type="text" value={newCompany.postalCode || ""} onChange={(e) => setNewCompany({ ...newCompany, postalCode: e.target.value })} className={inputCls} placeholder="Zip" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Country">
                                    <input type="text" value={newCompany.country || "USA"} onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="Phone">
                                    <input type="tel" value={newCompany.phone || ""} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })} className={inputCls} placeholder="(555) 123-4567" />
                                </Field>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
                            <button onClick={() => setShowAddCompanyModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                            <button onClick={handleAddCompany} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                                <Plus className="h-4 w-4" /> Add Company
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
