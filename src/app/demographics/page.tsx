"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";

type Demographics = {
  id?: number;
  portalUserId?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string | number[];
  gender?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  ehrPatientId?: number;
  medicalRecordNumber?: string;
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
          // "http://localhost:8080/api/portal/patient/me",
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("Failed to fetch demographics");

        const response = await safeJson(res);
        const data = response.data;
        const formatted = { ...data, dateOfBirth: parseDob(data.dateOfBirth) };
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
        dateOfBirth: toDobArray(demographics?.dateOfBirth as string),
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

      const response = await safeJson(res);
      const data = response.data;
      const formatted = { ...data, dateOfBirth: parseDob(data.dateOfBirth) };
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
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </label>
        <div className="w-full px-4 py-3 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 font-medium">
          {renderValue(value)}
        </div>
      </div>
    );
  }

  // Edit mode input box
  function FieldEdit(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    const { label, ...inputProps } = props;
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </label>
        <input
          {...inputProps}
          className="w-full px-4 py-3 text-sm rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
        />
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
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 dark:from-purple-600 dark:via-pink-600 dark:to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {demographics?.firstName} {demographics?.lastName}
              </h1>
              <p className="text-white/90 text-xs">Patient ID: {demographics?.ehrPatientId || 'N/A'}</p>
            </div>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-5 py-2 bg-white text-purple-600 font-semibold rounded-lg shadow-md hover:bg-purple-50 transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-all duration-200 flex items-center gap-2 text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setDemographics(original);
                    setEditMode(false);
                  }}
                  className="px-5 py-2 bg-white/20 text-white font-semibold rounded-lg shadow-md hover:bg-white/30 transition-all duration-200 flex items-center gap-2 backdrop-blur-sm text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {alert && (
          <div className="animate-fadeIn">
            <Alert
              variant={alert.variant}
              title={alert.title}
              message={alert.message}
            />
          </div>
        )}

        {demographics && (
          <div className="space-y-6">
            {/* Personal Info */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Personal Information
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editMode ? (
                  <>
                    <FieldEdit label="First Name" name="firstName" value={demographics.firstName || ""} onChange={handleChange} />
                    <FieldEdit label="Last Name" name="lastName" value={demographics.lastName || ""} onChange={handleChange} />
                    <FieldEdit label="Email" name="email" type="email" value={demographics.email || ""} onChange={handleChange} />
                    <FieldEdit label="Phone Number" name="phoneNumber" type="tel" value={demographics.phoneNumber || ""} onChange={handleChange} />
                    <FieldEdit label="Date of Birth" type="date" name="dateOfBirth" value={demographics.dateOfBirth as string} onChange={handleChange} />
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Gender</label>
                      <select
                        name="gender"
                        value={demographics.gender || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 text-sm rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                    <FieldView label="Email" value={demographics.email} />
                    <FieldView label="Phone Number" value={demographics.phoneNumber} />
                    <FieldView label="Date of Birth" value={demographics.dateOfBirth as string} />
                    <FieldView label="Gender" value={demographics.gender} />
                  </>
                )}
              </div>
            </section>

            {/* Address */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Address Information
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editMode ? (
                  <>
                    <FieldEdit label="Address Line 1" name="addressLine1" value={demographics.addressLine1 || ""} onChange={handleChange} />
                    <FieldEdit label="Address Line 2" name="addressLine2" value={demographics.addressLine2 || ""} onChange={handleChange} />
                    <FieldEdit label="City" name="city" value={demographics.city || ""} onChange={handleChange} />
                    <FieldEdit label="State" name="state" value={demographics.state || ""} onChange={handleChange} />
                    <FieldEdit label="Postal Code" name="postalCode" value={demographics.postalCode || ""} onChange={handleChange} />
                    <FieldEdit label="Country" name="country" value={demographics.country || ""} onChange={handleChange} />
                  </>
                ) : (
                  <>
                    <FieldView label="Address Line 1" value={demographics.addressLine1} />
                    <FieldView label="Address Line 2" value={demographics.addressLine2} />
                    <FieldView label="City" value={demographics.city} />
                    <FieldView label="State" value={demographics.state} />
                    <FieldView label="Postal Code" value={demographics.postalCode} />
                    <FieldView label="Country" value={demographics.country} />
                  </>
                )}
              </div>
            </section>

            {/* Emergency Contact */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Emergency Contact
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {editMode ? (
                  <>
                    <FieldEdit label="Emergency Contact Name" name="emergencyContactName" value={demographics.emergencyContactName || ""} onChange={handleChange} />
                    <FieldEdit label="Emergency Contact Phone" name="emergencyContactPhone" type="tel" value={demographics.emergencyContactPhone || ""} onChange={handleChange} />
                    <FieldEdit label="Emergency Contact Relationship" name="emergencyContactRelationship" value={demographics.emergencyContactRelationship || ""} onChange={handleChange} />
                  </>
                ) : (
                  <>
                    <FieldView label="Emergency Contact Name" value={demographics.emergencyContactName} />
                    <FieldView label="Emergency Contact Phone" value={demographics.emergencyContactPhone} />
                    <FieldView label="Emergency Contact Relationship" value={demographics.emergencyContactRelationship} />
                  </>
                )}
              </div>
            </section>

            {/* Medical Information */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Medical Records
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldView label="EHR Patient ID" value={demographics.ehrPatientId} />
                <FieldView label="Medical Record Number" value={demographics.medicalRecordNumber} />
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
