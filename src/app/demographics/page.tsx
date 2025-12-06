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

/* -------------------------------
   Helpers: DOB conversions
-------------------------------- */
function parseDob(dob: string | number[] | undefined): string | undefined {
  if (Array.isArray(dob) && dob.length === 3) {
    const [year, month, day] = dob;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (typeof dob === "string") return dob;
  return undefined;
}

function toDobArray(dob: string | undefined): number[] | undefined {
  if (!dob) return undefined;
  const [year, month, day] = dob.split("-").map(Number);
  return [year, month, day];
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("❌ Invalid JSON:", text);
    throw new Error("Invalid JSON from server");
  }
}

/* --------------------------------------------
   MAIN COMPONENT
--------------------------------------------- */
export default function DemographicsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL; // <— FIXED

  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [original, setOriginal] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [alert, setAlert] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  /* --------------------------------------------
     LOAD DEMOGRAPHICS
  --------------------------------------------- */
  useEffect(() => {
    async function loadDemographics() {
      try {
        const res = await fetchWithAuth(
          `${API}/api/portal/patient/me`,    // <— FIXED
          { headers: { Accept: "application/json" } }
        );

        if (!res.ok) throw new Error("Failed to load demographics");

        const response = await safeJson(res);
        const data = response.data;

        const formatted = { ...data, dateOfBirth: parseDob(data.dateOfBirth) };
        setDemographics(formatted);
        setOriginal(formatted);
      } catch (err) {
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
  }, [API]);

  /* --------------------------------------------
     FORM CHANGE HANDLERS
  --------------------------------------------- */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setDemographics((prev) =>
      prev ? { ...prev, [name]: type === "checkbox" ? checked : value } : prev
    );
  }

  /* --------------------------------------------
     SAVE DEMOGRAPHICS
  --------------------------------------------- */
  async function handleSave() {
    try {
      const payload = {
        ...demographics,
        dateOfBirth: toDobArray(demographics?.dateOfBirth as string),
      };

      const res = await fetchWithAuth(
        `${API}/api/portal/patients/me/demographics`,  // <— FIXED
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
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

  /* --------------------------------------------
     Format for view-only fields
  --------------------------------------------- */
  function renderValue(v: unknown): React.ReactNode {
    if (v === null || v === undefined || v === "") return "—";
    if (["string", "number", "boolean"].includes(typeof v)) return String(v);
    return JSON.stringify(v);
  }

  function FieldView({ label, value }: { label: string; value?: unknown }) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-500 uppercase">
          {label}
        </label>
        <div className="w-full px-4 py-3 text-sm rounded-lg bg-gray-100">
          {renderValue(value)}
        </div>
      </div>
    );
  }

  function FieldEdit(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    const { label, ...rest } = props;

    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-500 uppercase">
          {label}
        </label>
        <input
          {...rest}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }

  /* --------------------------------------------
     LOADING
  --------------------------------------------- */
  if (loading) {
    return (
      <AdminLayout>
        <p className="text-center text-gray-500">Loading demographics…</p>
      </AdminLayout>
    );
  }

  /* --------------------------------------------
     MAIN UI
  --------------------------------------------- */
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* HEADER CARD */}
        <div className="bg-gradient-to-r from-purple-500 to-orange-500 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {demographics?.firstName} {demographics?.lastName}
              </h1>
              <p className="opacity-90 text-sm">
                Patient ID: {demographics?.ehrPatientId || "N/A"}
              </p>
            </div>

            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-white text-purple-600 rounded-lg shadow-sm"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setDemographics(original);
                  }}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ALERTS */}
        {alert && (
          <Alert variant={alert.variant} title={alert.title} message={alert.message} />
        )}

        {/* FORM SECTIONS */}
        {demographics && (
          <>
            {/* PERSONAL INFO */}
            <Section title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editMode ? (
                  <>
                    <FieldEdit label="First Name" name="firstName" value={demographics.firstName} onChange={handleChange} />
                    <FieldEdit label="Last Name" name="lastName" value={demographics.lastName} onChange={handleChange} />
                    <FieldEdit label="Email" name="email" value={demographics.email || ""} onChange={handleChange} />
                    <FieldEdit label="Phone Number" name="phoneNumber" value={demographics.phoneNumber || ""} onChange={handleChange} />
                    <FieldEdit label="Date of Birth" name="dateOfBirth" type="date" value={demographics.dateOfBirth as string} onChange={handleChange} />
                  </>
                ) : (
                  <>
                    <FieldView label="First Name" value={demographics.firstName} />
                    <FieldView label="Last Name" value={demographics.lastName} />
                    <FieldView label="Email" value={demographics.email} />
                    <FieldView label="Phone Number" value={demographics.phoneNumber} />
                    <FieldView label="Date of Birth" value={demographics.dateOfBirth} />
                  </>
                )}
              </div>
            </Section>

            {/* ADDRESS */}
            <Section title="Address">
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
            </Section>

            {/* EMERGENCY CONTACT */}
            <Section title="Emergency Contact">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editMode ? (
                  <>
                    <FieldEdit label="Emergency Contact Name" name="emergencyContactName" value={demographics.emergencyContactName || ""} onChange={handleChange} />
                    <FieldEdit label="Emergency Contact Phone" name="emergencyContactPhone" value={demographics.emergencyContactPhone || ""} onChange={handleChange} />
                    <FieldEdit label="Relationship" name="emergencyContactRelationship" value={demographics.emergencyContactRelationship || ""} onChange={handleChange} />
                  </>
                ) : (
                  <>
                    <FieldView label="Emergency Contact Name" value={demographics.emergencyContactName} />
                    <FieldView label="Emergency Contact Phone" value={demographics.emergencyContactPhone} />
                    <FieldView label="Relationship" value={demographics.emergencyContactRelationship} />
                  </>
                )}
              </div>
            </Section>

            {/* MEDICAL RECORDS */}
            <Section title="Medical Records">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldView label="EHR Patient ID" value={demographics.ehrPatientId} />
                <FieldView label="Medical Record Number" value={demographics.medicalRecordNumber} />
              </div>
            </Section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

/* --------------------------------------------
   REUSABLE SECTION COMPONENT
--------------------------------------------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}
