"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  User, MapPin, Phone, Heart, MessageSquare, Pill,
  AlertCircle, Pencil, Save, X, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";

// ======================== Types ========================

type FieldOption = { value: string; label: string };

type FieldConfig = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  colSpan?: number;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  fhirMapping?: { resource: string; path: string; type: string };
};

type SectionConfig = {
  key: string;
  title: string;
  columns?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: FieldConfig[];
};

type TabConfig = {
  tabKey: string;
  label: string;
  icon: string;
  fieldConfig: { sections: SectionConfig[] };
  fhirResources: unknown[];
};

// ======================== Icons ========================

const sectionIcons: Record<string, React.ReactNode> = {
  "personal-info": <User className="h-4 w-4 text-blue-600" />,
  "contact-info": <Phone className="h-4 w-4 text-blue-600" />,
  "address": <MapPin className="h-4 w-4 text-blue-600" />,
  "emergency-contact": <Phone className="h-4 w-4 text-red-600" />,
  "communication-preferences": <MessageSquare className="h-4 w-4 text-green-600" />,
  "pharmacy": <Pill className="h-4 w-4 text-purple-600" />,
};

// ======================== Dynamic Field ========================

function DynamicField({
  field, value, editMode, onChange,
}: {
  field: FieldConfig;
  value: unknown;
  editMode: boolean;
  onChange: (key: string, val: unknown) => void;
}) {
  const strVal = value === null || value === undefined ? "" : String(value);

  // Address type
  if (field.type === "address") {
    const addr = (typeof value === "object" && value !== null ? value : {}) as Record<string, string>;
    if (!editMode) {
      const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
      return (
        <div className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
          <div className="px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-100">
            {parts.length > 0 ? parts.join(", ") : "—"}
          </div>
        </div>
      );
    }
    const updateAddr = (subKey: string, val: string) => onChange(field.key, { ...addr, [subKey]: val });
    return (
      <>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Address Line 1</label>
          <input value={addr.line1 || ""} onChange={(e) => updateAddr("line1", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Address Line 2</label>
          <input value={addr.line2 || ""} onChange={(e) => updateAddr("line2", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
          <input value={addr.city || ""} onChange={(e) => updateAddr("city", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
          <input value={addr.state || ""} onChange={(e) => updateAddr("state", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Postal Code</label>
          <input value={addr.postalCode || ""} onChange={(e) => updateAddr("postalCode", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
          <input value={addr.country || ""} onChange={(e) => updateAddr("country", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </>
    );
  }

  // Toggle type
  if (field.type === "toggle") {
    const checked = value === true || value === "true";
    if (!editMode) {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
          <div className="px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-100">
            {checked ? "Yes" : "No"}
          </div>
          {field.helpText && <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>}
        </div>
      );
    }
    return (
      <div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onChange(field.key, !checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <label className="text-sm text-gray-700">{field.label}</label>
        </div>
        {field.helpText && <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>}
      </div>
    );
  }

  // Select type
  if (field.type === "select" || field.type === "combobox") {
    const options = field.options || [];
    if (!editMode) {
      const selected = options.find((o) => o.value === strVal);
      return (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
          <div className="px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-100">
            {selected?.label || strVal || "—"}
          </div>
        </div>
      );
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <select value={strVal} onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  // Default: text, date, email, phone, number
  if (!editMode) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
        <div className="px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-100">
          {strVal || "—"}
        </div>
      </div>
    );
  }

  const inputType =
    field.type === "date" ? "date" :
    field.type === "email" ? "email" :
    field.type === "phone" ? "tel" :
    field.type === "number" ? "number" : "text";

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={inputType}
        value={strVal}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

// ======================== Section ========================

function DynamicSection({
  section, formData, editMode, onChange,
}: {
  section: SectionConfig;
  formData: Record<string, unknown>;
  editMode: boolean;
  onChange: (key: string, val: unknown) => void;
}) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false);
  const isCollapsible = section.collapsible ?? false;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <button
        type="button"
        onClick={() => isCollapsible && setCollapsed(!collapsed)}
        className={`flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4 w-full text-left ${isCollapsible ? "cursor-pointer" : "cursor-default"}`}
      >
        {sectionIcons[section.key] || <Heart className="h-4 w-4 text-gray-400" />}
        {section.title}
        {isCollapsible && (
          collapsed
            ? <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            : <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
        )}
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.fields.map((field) => (
            <DynamicField
              key={field.key}
              field={field}
              value={formData[field.key]}
              editMode={editMode}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ======================== Main Page ========================

export default function DemographicsPage() {
  const [config, setConfig] = useState<TabConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [original, setOriginal] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [notLinked, setNotLinked] = useState(false);

  const TAB_KEY = "portal-demographics";

  useEffect(() => {
    async function load() {
      try {
        const [configRes, dataRes] = await Promise.all([
          fetchWithAuth(`/api/portal/resource/${TAB_KEY}/config`),
          fetchWithAuth(`/api/portal/resource/${TAB_KEY}`),
        ]);

        const configJson = await configRes.json();
        if (configJson.success && configJson.data) {
          setConfig(configJson.data);
        }

        const dataJson = await dataRes.json();
        if (dataJson.success && dataJson.data) {
          const content = dataJson.data.content;
          if (content && content.length > 0) {
            setFormData(content[0]);
            setOriginal(content[0]);
          }
        } else if (dataJson.message?.includes("not linked") || dataJson.message?.includes("not found") || dataJson.message?.includes("not approved")) {
          setNotLinked(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not load demographics";
        if (msg.includes("not linked")) {
          setNotLinked(true);
        } else {
          setAlert({ type: "error", message: msg });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (alert) {
      const t = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  const handleChange = useCallback((key: string, val: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/portal/resource/${TAB_KEY}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data) {
          const merged = { ...formData, ...json.data };
          setFormData(merged);
          setOriginal(merged);
        } else {
          setOriginal({ ...formData });
        }
        setEditMode(false);
        setAlert({ type: "success", message: "Demographics updated successfully." });
      } else {
        setAlert({ type: "error", message: json.message || "Failed to update." });
      }
    } catch {
      setAlert({ type: "error", message: "Failed to update demographics." });
    } finally {
      setSaving(false);
    }
  }

  const patientName =
    formData.firstName || formData.lastName
      ? `${formData.firstName || ""} ${formData.lastName || ""}`.trim()
      : "Demographics";

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patientName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formData.mrn ? `MRN: ${formData.mrn}` : "Your personal information"}
            </p>
          </div>
          {!notLinked && !loading && (
            !editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Pencil className="h-4 w-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <button
                  onClick={() => { setEditMode(false); setFormData(original); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            )
          )}
        </div>

        {/* Alert */}
        {alert && (
          <div className={`flex items-start gap-3 rounded-xl p-4 ${alert.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${alert.type === "success" ? "text-green-600" : "text-red-600"}`} />
            <p className={`text-sm ${alert.type === "success" ? "text-green-700" : "text-red-700"}`}>{alert.message}</p>
          </div>
        )}

        {/* Not linked message */}
        {notLinked && (
          <div className="flex items-start gap-3 rounded-xl p-6 bg-amber-50 border border-amber-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Account Not Linked</h3>
              <p className="text-sm text-amber-700 mt-1">
                Your portal account has not yet been linked to your medical record.
                Please contact your provider to complete the linking process.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}

        {/* Dynamic sections from config */}
        {!loading && !notLinked && config?.fieldConfig?.sections && (
          <div className="space-y-6">
            {config.fieldConfig.sections.map((section) => (
              <DynamicSection
                key={section.key}
                section={section}
                formData={formData}
                editMode={editMode}
                onChange={handleChange}
              />
            ))}

            {/* Read-only metadata */}
            {Boolean(formData.id || formData.fhirId) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Medical Records</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Patient ID</label>
                    <div className="px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-100">
                      {String(formData.fhirId || formData.id || "—")}
                    </div>
                  </div>
                  {Boolean(formData.mrn) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Medical Record Number</label>
                      <div className="px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-100">
                        {String(formData.mrn)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
