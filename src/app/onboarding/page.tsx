"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { usePortalForms, type PortalFormDef } from "@/hooks/usePortalConfig";
import AdminLayout from "@/app/(admin)/layout";

export default function OnboardingPage() {
    const router = useRouter();
    const { forms, loading } = usePortalForms("onboarding");
    const [consentForms, setConsentForms] = useState<PortalFormDef[]>([]);
    const [allForms, setAllForms] = useState<PortalFormDef[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load consent forms that show on registration
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth("/api/portal/config/forms/active?type=consent");
                if (res.ok) {
                    const data = await res.json();
                    const regForms = (data as PortalFormDef[]).filter(
                        (f) => f.settings?.showOnRegistration
                    );
                    setConsentForms(regForms);
                }
            } catch {}
        })();
    }, []);

    // Merge onboarding + consent forms into steps
    useEffect(() => {
        if (!loading) {
            const registrationForms = forms.filter((f) => f.settings?.showOnRegistration !== false);
            setAllForms([...registrationForms, ...consentForms]);
        }
    }, [forms, consentForms, loading]);

    const currentForm = allForms[currentStep];
    const totalSteps = allForms.length;
    const isLastStep = currentStep === totalSteps - 1;

    const handleFieldChange = (formKey: string, fieldKey: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [formKey]: { ...(prev[formKey] || {}), [fieldKey]: value },
        }));
    };

    const handleNext = async () => {
        if (!currentForm) return;

        // Validate required fields
        const fc = typeof currentForm.fieldConfig === "string"
            ? JSON.parse(currentForm.fieldConfig)
            : currentForm.fieldConfig;

        const data = formData[currentForm.formKey] || {};
        const missingFields: string[] = [];

        if (fc?.sections) {
            for (const section of fc.sections) {
                for (const field of section.fields || []) {
                    if (field.required && !data[field.key]) {
                        missingFields.push(field.label || field.key);
                    }
                }
            }
        }

        if (missingFields.length > 0) {
            setError(`Please fill in: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? ` and ${missingFields.length - 3} more` : ""}`);
            return;
        }

        setError(null);

        if (isLastStep) {
            // Submit all form data
            setSaving(true);
            try {
                // Submit each form's data
                for (const form of allForms) {
                    const submitData = formData[form.formKey];
                    if (submitData && Object.keys(submitData).length > 0) {
                        await fetchWithAuth("/api/portal/patient/me", {
                            method: "PUT",
                            body: JSON.stringify({
                                formKey: form.formKey,
                                formType: form.formType,
                                data: submitData,
                            }),
                        });
                    }
                }

                // Mark onboarding complete in localStorage
                localStorage.setItem("onboarding_complete", "true");
                router.push("/dashboard");
            } catch (err) {
                setError("Failed to save. Please try again.");
            }
            setSaving(false);
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
            setError(null);
        }
    };

    const handleSkip = () => {
        localStorage.setItem("onboarding_complete", "true");
        router.push("/dashboard");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (allForms.length === 0) {
        // No onboarding forms configured — skip to dashboard
        if (typeof window !== "undefined") {
            localStorage.setItem("onboarding_complete", "true");
            router.push("/dashboard");
        }
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <span>Step {currentStep + 1} of {totalSteps}</span>
                        <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 text-xs">
                            Skip for now
                        </button>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
                        <h1 className="text-xl font-bold text-white">{currentForm?.title}</h1>
                        {currentForm?.description && (
                            <p className="text-blue-100 text-sm mt-1">{currentForm.description}</p>
                        )}
                        {currentForm?.formType === "consent" && (
                            <span className="inline-flex items-center mt-2 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                                Consent Required
                            </span>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="px-8 py-6">
                        {error && (
                            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <DynamicPortalForm
                            fieldConfig={currentForm?.fieldConfig}
                            data={formData[currentForm?.formKey] || {}}
                            onChange={(key, value) => handleFieldChange(currentForm.formKey, key, value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? "Saving..." : isLastStep ? "Complete" : "Continue"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Dynamic Form Renderer for Portal
// ──────────────────────────────────────────────

function DynamicPortalForm({
    fieldConfig,
    data,
    onChange,
}: {
    fieldConfig: any;
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
}) {
    const fc = typeof fieldConfig === "string" ? JSON.parse(fieldConfig) : fieldConfig;
    if (!fc?.sections) return <p className="text-gray-400 text-sm">No form fields configured</p>;

    return (
        <div className="space-y-8">
            {fc.sections.map((section: any) => (
                <div key={section.key}>
                    {section.title && (
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">
                            {section.title}
                        </h3>
                    )}
                    <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: `repeat(${section.columns || 1}, minmax(0, 1fr))` }}
                    >
                        {(section.fields || []).map((field: any) => (
                            <div
                                key={field.key}
                                style={{ gridColumn: `span ${field.colSpan || 1}` }}
                            >
                                <PortalField
                                    field={field}
                                    value={data[field.key] ?? ""}
                                    onChange={(val) => onChange(field.key, val)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PortalField({
    field,
    value,
    onChange,
}: {
    field: any;
    value: any;
    onChange: (val: any) => void;
}) {
    const { key, label, type, required, placeholder, helpText, options } = field;

    if (type === "computed" || type === "group") {
        return (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 leading-relaxed">
                {helpText || label}
            </div>
        );
    }

    const labelEl = label ? (
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    ) : null;

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

    switch (type) {
        case "textarea":
            return (
                <div>
                    {labelEl}
                    <textarea
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className={inputClass}
                    />
                </div>
            );

        case "select":
            return (
                <div>
                    {labelEl}
                    <select
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className={inputClass}
                    >
                        <option value="">{placeholder || "Select..."}</option>
                        {(options || []).map((opt: any) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            );

        case "checkbox":
        case "boolean":
            return (
                <div className="flex items-start gap-3 py-1">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 leading-relaxed">
                        {label}
                        {required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                </div>
            );

        case "date":
            return (
                <div>
                    {labelEl}
                    <input
                        type="date"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className={inputClass}
                    />
                </div>
            );

        case "number":
            return (
                <div>
                    {labelEl}
                    <input
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                    />
                </div>
            );

        case "phone":
            return (
                <div>
                    {labelEl}
                    <input
                        type="tel"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || "(555) 123-4567"}
                        className={inputClass}
                    />
                </div>
            );

        case "email":
            return (
                <div>
                    {labelEl}
                    <input
                        type="email"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || "email@example.com"}
                        className={inputClass}
                    />
                </div>
            );

        case "radio":
            return (
                <div>
                    {labelEl}
                    <div className="flex flex-wrap gap-4 mt-1">
                        {(options || []).map((opt: any) => (
                            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name={key}
                                    value={opt.value}
                                    checked={value === opt.value}
                                    onChange={() => onChange(opt.value)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>
            );

        default: // text and any other type
            return (
                <div>
                    {labelEl}
                    <input
                        type="text"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                    />
                    {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
                </div>
            );
    }
}
