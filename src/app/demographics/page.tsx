"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";

type Demographics = {
  id?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob?: string | number[];
  sex?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phoneMobile?: string;
  contactEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allowSMS?: boolean;
  allowEmail?: boolean;
  allowVoiceMessage?: boolean;
  allowMailMessage?: boolean;
};

// Convert [YYYY,MM,DD] → "YYYY-MM-DD"
function parseDob(dob: string | number[] | undefined): string | undefined {
  if (Array.isArray(dob) && dob.length === 3) {
    const [year, month, day] = dob;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (typeof dob === "string") return dob;
  return undefined;
}

// Convert "YYYY-MM-DD" → [YYYY,MM,DD]
function toDobArray(dob: string | undefined): number[] | undefined {
  if (!dob) return undefined;
  const [year, month, day] = dob.split("-").map(Number);
  return [year, month, day];
}

// Safe JSON parsing
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("❌ Non-JSON response:", text);
    throw new Error("Invalid response from server");
  }
}

export default function DemographicsPage() {
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [original, setOriginal] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [alert, setAlert] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    async function loadDemographics() {
      try {
        const res = await fetchWithAuth(
          "http://localhost:8080/api/portal/patients/me/demographics",
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("Failed to fetch demographics");

        const data = await safeJson(res);
        const formatted = { ...data.data, dob: parseDob(data.data.dob) };
        setDemographics(formatted);
        setOriginal(formatted);
      } catch {
        setAlert({
          variant: "error",
          title: "Error",
          message: "Could not load demographics.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadDemographics();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setDemographics((prev) =>
      prev ? { ...prev, [name]: type === "checkbox" ? checked : value } : prev
    );
  }

  async function handleSave() {
    try {
      const payload = {
        ...demographics,
        dob: toDobArray(demographics?.dob as string),
      };

      const res = await fetchWithAuth(
        "http://localhost:8080/api/portal/patients/me/demographics",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Failed to update demographics");

      const data = await safeJson(res);
      const formatted = { ...data.data, dob: parseDob(data.data.dob) };
      setDemographics(formatted);
      setOriginal(formatted);
      setEditMode(false);

      setAlert({
        variant: "success",
        title: "Success",
        message: "Demographics updated successfully.",
      });
    } catch {
      setAlert({
        variant: "error",
        title: "Error",
        message: "Failed to update demographics.",
      });
    }
  }

  // View mode grey box
  function renderValue(v: unknown) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  function FieldView({ label, value }: { label: string; value?: unknown }) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </label>
        <div className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
          {renderValue(value)}
        </div>
      </div>
    );
  }

  // Edit mode input box
  function FieldEdit(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    const { label, ...inputProps } = props;
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </label>
        <input
          {...inputProps}
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  // Toggle Switch component
  function ToggleSwitch({
    label,
    name,
    checked,
    onChange,
    disabled,
  }: {
    label: string;
    name: string;
    checked: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    disabled?: boolean;
  }) {
    return (
      <div className="flex items-center justify-between p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition"></div>
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition"></div>
        </label>
      </div>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-center text-gray-500 dark:text-gray-400">
          Loading demographics...
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Patient Demographics
          </h1>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Edit
            </button>
          ) : (
            <div className="space-x-2">
              <button
                onClick={handleSave}
                className="px-4 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDemographics(original);
                  setEditMode(false);
                }}
                className="px-4 py-1.5 text-sm rounded bg-gray-300 dark:bg-gray-600 dark:text-white hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {alert && (
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
          />
        )}

        {demographics && (
          <div className="space-y-6">
            {/* Personal Info */}
            <section>
              <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-3">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <FieldEdit label="First Name" name="firstName" value={demographics.firstName || ""} onChange={handleChange} />
                    <FieldEdit label="Last Name" name="lastName" value={demographics.lastName || ""} onChange={handleChange} />
                    <FieldEdit label="Date of Birth" type="date" name="dob" value={demographics.dob as string} onChange={handleChange} />
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Sex</label>
                      <select
                        name="sex"
                        value={demographics.sex || ""}
                        onChange={handleChange}
                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <FieldView label="First Name" value={demographics.firstName} />
                    <FieldView label="Last Name" value={demographics.lastName} />
                    <FieldView label="Date of Birth" value={demographics.dob as string} />
                    <FieldView label="Sex" value={demographics.sex} />
                  </>
                )}
              </div>
            </section>

            {/* Address */}
            <section>
              <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-3">
                Address Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <FieldEdit label="Address" name="address" value={demographics.address || ""} onChange={handleChange} />
                    <FieldEdit label="City" name="city" value={demographics.city || ""} onChange={handleChange} />
                    <FieldEdit label="State" name="state" value={demographics.state || ""} onChange={handleChange} />
                    <FieldEdit label="Postal Code" name="postalCode" value={demographics.postalCode || ""} onChange={handleChange} />
                  </>
                ) : (
                  <>
                    <FieldView label="Address" value={demographics.address} />
                    <FieldView label="City" value={demographics.city} />
                    <FieldView label="State" value={demographics.state} />
                    <FieldView label="Postal Code" value={demographics.postalCode} />
                  </>
                )}
              </div>
            </section>

            {/* Communication */}
            <section>
              <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-3">
                Communication Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <ToggleSwitch label="Allow SMS" name="allowSMS" checked={!!demographics.allowSMS} onChange={handleChange} />
                    <ToggleSwitch label="Allow Email" name="allowEmail" checked={!!demographics.allowEmail} onChange={handleChange} />
                    <ToggleSwitch label="Allow Voice Message" name="allowVoiceMessage" checked={!!demographics.allowVoiceMessage} onChange={handleChange} />
                    <ToggleSwitch label="Allow Mail Message" name="allowMailMessage" checked={!!demographics.allowMailMessage} onChange={handleChange} />
                  </>
                ) : (
                  <>
                    <ToggleSwitch label="Allow SMS" name="allowSMS" checked={!!demographics.allowSMS} disabled />
                    <ToggleSwitch label="Allow Email" name="allowEmail" checked={!!demographics.allowEmail} disabled />
                    <ToggleSwitch label="Allow Voice Message" name="allowVoiceMessage" checked={!!demographics.allowVoiceMessage} disabled />
                    <ToggleSwitch label="Allow Mail Message" name="allowMailMessage" checked={!!demographics.allowMailMessage} disabled />
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
