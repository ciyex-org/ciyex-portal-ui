"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useInsurance } from "@/hooks/useInsurance";
import Alert from "@/components/ui/alert/Alert";

/**
 * Insurance company master data
 */
type InsuranceCompany = {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  payerId?: string;
  phone?: string;
};

/**
 * One coverage "level" policy (Primary / Secondary / Tertiary)
 * – now unified to always use Subscriber Information
 */
type InsurancePolicy = {
  providerId: number | null;
  planName: string;
  effectiveDate: string;
  effectiveDateEnd: string;
  policyNumber: string;
  groupNumber: string;
  subscriberId: string;
  copay: string;
  secondaryMedicareType: "N/A" | "Part A" | "Part B";

  // Policyholder/Subscriber Information (maps to byholder* fields in backend)
  byholderName: string;
  
  
  byholderRelation: string;
  subscriberEmployer: string;
  subscriberAddressLine1: string;
  subscriberAddressLine2: string;
  subscriberCity: string;
  subscriberState: string;
  subscriberZipCode: string;
  subscriberCountry: string;
  subscriberPhone: string;

  // Insurance card uploads
  cardFrontUrl: string;
  cardBackUrl: string;
  cardFrontFile?: File | null;
  cardBackFile?: File | null;
};

/**
 * Default empty policy used to initialize all levels
 */
const initialPolicy: InsurancePolicy = {
  providerId: null,
  planName: "",
  effectiveDate: "",
  effectiveDateEnd: "",
  policyNumber: "",
  groupNumber: "",
  subscriberId: "",
  copay: "",
  secondaryMedicareType: "N/A",

  // Policyholder info defaults
  byholderName: "",
  byholderRelation: "",
  subscriberEmployer: "",
  subscriberAddressLine1: "",
  subscriberAddressLine2: "",
  subscriberCity: "",
  subscriberState: "",
  subscriberZipCode: "",
  subscriberCountry: "USA",
  subscriberPhone: "",

  // Insurance card uploads
  cardFrontUrl: "",
  cardBackUrl: "",
  cardFrontFile: null,
  cardBackFile: null,
};

type Level = "primary" | "secondary" | "tertiary";

/**
 * Backend response for a coverage
 * – extended with optional subscriber fields and card URLs
 */
type CoverageResponse = {
  id: number;
  coverageType: string;
  planName: string;
  policyNumber: string;
  groupNumber?: string;
  coverageStartDate: string;
  coverageEndDate: string;
  copayAmount?: number;
  insuranceCompany: InsuranceCompany;

  // Policyholder fields from backend (byholder* fields)
  byholderName?: string;
  byholderRelation?: string;
  subscriberEmployer?: string;
  subscriberAddressLine1?: string;
  subscriberAddressLine2?: string;
  subscriberCity?: string;
  subscriberState?: string;
  subscriberZipCode?: string;
  subscriberCountry?: string;
  subscriberPhone?: string;

  // Insurance card URLs
  cardFrontUrl?: string;
  cardBackUrl?: string;
};

type CoverageIds = Record<Level, number | null>;

/**
 * Portal patient info (used to auto-fill subscriber when relation = Self)
 */
type PatientInfo = {
  name?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  dob?: string;
  ehrPatientId?: number;
};

export default function InsurancePage() {
  const { coverages, loading, error, refetch } = useInsurance();

  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [policies, setPolicies] = useState<Record<Level, InsurancePolicy>>({
    primary: { ...initialPolicy },
    secondary: { ...initialPolicy },
    tertiary: { ...initialPolicy },
  });

  const [coverageIds, setCoverageIds] = useState<CoverageIds>({
    primary: null,
    secondary: null,
    tertiary: null,
  });

  const [editLevel, setEditLevel] = useState<Level | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({});
  const [alert, setAlert] = useState<{
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Insurance company search/add modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<InsuranceCompany>>({
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "USA",
    payerId: "",
    phone: "",
  });

  // Card upload preview state
  const [cardPreviews, setCardPreviews] = useState<{
    front: string | null;
    back: string | null;
  }>({ front: null, back: null });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Load insurance companies
   */
  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/insurance-companies`
        );
        const data = await res.json();
        // Accept either { data: [...] } or plain array response
        setCompanies(data.data ?? data ?? []);
      } catch (err) {
        console.error("Failed to load companies", err);
      }
    }
    loadCompanies();
  }, []);

  /**
   * Load portal patient profile (logged-in user)
   * Used to auto-fill subscriber when Relationship = Self
   */
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/portal/patient/me`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.data) {
          const dto = data.data;

          const firstName = dto.firstName || dto.givenName || undefined;
          const lastName = dto.lastName || dto.familyName || undefined;

          const displayName =
            dto.fullName ||
            dto.name ||
            dto.displayName ||
            (firstName || lastName
              ? `${firstName || ""} ${lastName || ""}`.trim()
              : undefined);

          setPatientInfo({
            name: displayName || undefined,
            firstName,
            lastName,
            mrn: dto.mrn || dto.id || undefined,
            dob: dto.dob || dto.birthDate || undefined,
            ehrPatientId: dto.ehrPatientId || dto.ehr_patient_id || undefined,
          });
        }
      } catch (err) {
        console.error("Failed to load portal patient profile", err);
      }
    }
    loadProfile();
  }, []);

  /**
   * Map backend coverages → frontend policies
   */
  useEffect(() => {
    if (coverages.length > 0) {
      console.debug('[InsurancePage] raw coverages:', coverages);
      const existingPolicies: Record<Level, InsurancePolicy> = {
        primary: { ...initialPolicy },
        secondary: { ...initialPolicy },
        tertiary: { ...initialPolicy },
      };
      const existingIds: CoverageIds = {
        primary: null,
        secondary: null,
        tertiary: null,
      };

      coverages.forEach((coverage: CoverageResponse) => {
        const level = coverage.coverageType?.toLowerCase() as Level;
        if (level && existingPolicies[level]) {
          existingPolicies[level] = {
            ...existingPolicies[level],
            providerId: coverage.insuranceCompany?.id || null,
            planName: coverage.planName || "",
            effectiveDate: coverage.coverageStartDate || "",
            effectiveDateEnd: coverage.coverageEndDate || "",
            policyNumber: coverage.policyNumber || "",
            groupNumber: coverage.groupNumber || "",
            subscriberId: coverage.policyNumber || "", // Use policy number as subscriber ID
            copay: coverage.copayAmount
              ? coverage.copayAmount.toString()
              : "",
            secondaryMedicareType: "N/A", // still UI-only for now

            // Policyholder info from backend byholder* fields
            byholderName: coverage.byholderName || "",
            byholderRelation: coverage.byholderRelation || "",
            subscriberEmployer: coverage.subscriberEmployer || "",
            subscriberAddressLine1: coverage.subscriberAddressLine1 || "",
            subscriberAddressLine2: coverage.subscriberAddressLine2 || "",
            subscriberCity: coverage.subscriberCity || "",
            subscriberState: coverage.subscriberState || "",
            subscriberZipCode: coverage.subscriberZipCode || "",
            subscriberCountry: coverage.subscriberCountry || "USA",
            subscriberPhone: coverage.subscriberPhone || "",

            // Card URLs
            cardFrontUrl: coverage.cardFrontUrl || "",
            cardBackUrl: coverage.cardBackUrl || "",
            cardFrontFile: null,
            cardBackFile: null,
          };

          existingIds[level] = coverage.id;
        }
      });

      // Debug mapped policies
      console.debug('[InsurancePage] mapped policies:', existingPolicies);

      setPolicies(existingPolicies);
      setCoverageIds(existingIds);
    }
  }, [coverages]);

  /**
   * Generic field change handler for policy fields
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    level: Level
  ) => {
    const { name, value } = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    setPolicies((prev) => ({
      ...prev,
      [level]: { ...prev[level], [name]: value },
    }));
  };

  /**
   * Special handler: change subscriber relation & optionally auto-fill
   * when Relationship = Self
   */
  const handleSubscriberRelationChange = (level: Level, relation: string) => {
    setPolicies((prev) => {
      const current = prev[level];

      // Base update: always set relation
      const updated: InsurancePolicy = {
        ...current,
        byholderRelation: relation,
      };

      // If relation is Self → auto-fill policyholder name from patient profile
      if (relation === "Self") {
        const fullName = patientInfo.name || 
          [patientInfo.firstName, patientInfo.lastName].filter(Boolean).join(" ");
        
        updated.byholderName = fullName || current.byholderName;
      }

      return {
        ...prev,
        [level]: updated,
      };
    });
  };

  /**
   * Save a single coverage level (Primary / Secondary / Tertiary)
   */
  const handleSave = async (level: Level) => {
    console.log("💾 Attempting to save insurance for level:", level);

    try {
      const policy = policies[level];
      const coverageId = coverageIds[level];

      // Validate primary/secondary/tertiary hierarchy
      if (level === "secondary" && !coverageIds.primary) {
        setAlert({
          variant: "warning",
          title: "Primary Insurance Required",
          message: "Please add primary insurance before adding secondary coverage.",
        });
        return;
      }

      if (level === "tertiary" && !coverageIds.secondary) {
        setAlert({
          variant: "warning",
          title: "Secondary Insurance Required",
          message: "Please add secondary insurance before adding tertiary coverage.",
        });
        return;
      }

      // Validate dates
      if (policy.effectiveDate && policy.effectiveDateEnd) {
        if (new Date(policy.effectiveDateEnd) < new Date(policy.effectiveDate)) {
          setAlert({
            variant: "error",
            title: "Invalid Dates",
            message: "Expiration date must be after the effective date.",
          });
          return;
        }
      }

      // Prepare the coverage data for the backend API
      // Note: patientId is automatically resolved by backend from JWT email
      const coverageData = {
        coverageType: level.toUpperCase(), // PRIMARY, SECONDARY, TERTIARY
        planName: policy.planName,
        policyNumber: policy.policyNumber,
        groupNumber: policy.groupNumber,
        coverageStartDate: policy.effectiveDate,
        coverageEndDate: policy.effectiveDateEnd,
        copayAmount: policy.copay ? parseFloat(policy.copay) : null,
        insuranceCompany: {
          id: policy.providerId,
        },

        // Policyholder Information – maps to byholder* fields in backend
        byholderName: policy.byholderName,
        byholderRelation: policy.byholderRelation,
        subscriberEmployer: policy.subscriberEmployer,
        subscriberAddressLine1: policy.subscriberAddressLine1,
        subscriberAddressLine2: policy.subscriberAddressLine2,
        subscriberCity: policy.subscriberCity,
        subscriberState: policy.subscriberState,
        subscriberZipCode: policy.subscriberZipCode,
        subscriberCountry: policy.subscriberCountry,
        subscriberPhone: policy.subscriberPhone,

        // UI-only: still not mapped in DTO, but kept here for future
        secondaryMedicareType:
          level === "secondary" ? policy.secondaryMedicareType : "N/A",
      };

      console.log(
        `${coverageId ? "Updating" : "Creating"} ${level} coverage:`,
        coverageData
      );

      // Use PUT for updates, POST for creates
      const method = coverageId ? "PUT" : "POST";
      const url = coverageId
        ? `${getEnv("NEXT_PUBLIC_API_URL")}/api/coverages/${coverageId}`
        : `${getEnv("NEXT_PUBLIC_API_URL")}/api/coverages`;

      console.log("📡 API Request:", method, url);
      console.log("📦 Request body:", JSON.stringify(coverageData, null, 2));

      const response = await fetchWithAuth(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(coverageData),
      });

      console.log("📨 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(
          `Failed to ${
            coverageId ? "update" : "create"
          } coverage: ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log("✅ Coverage saved successfully:", result);

      // Get the coverage ID
      const savedCoverageId = coverageId || result.data?.id;

      // Update the coverage ID if this was a create operation
      if (!coverageId && result.data?.id) {
        setCoverageIds((prev) => ({
          ...prev,
          [level]: result.data.id,
        }));
      }

      // Upload insurance card images if provided
      await uploadInsuranceCards(level, savedCoverageId, policy);

      setAlert({
        variant: "success",
        title: "Success",
        message: `Your ${level} insurance information was ${
          coverageId ? "updated" : "added"
        } successfully.`,
      });
      setEditLevel(null);

      // Refresh the insurance data
      await refetch();
    } catch (err) {
      console.error("Failed to save coverage", err);
      setAlert({
        variant: "error",
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to save insurance information. Please try again.",
      });
    }
  };

  /**
   * Upload insurance card images (front/back) to S3
   */
  const uploadInsuranceCards = async (
    level: Level,
    coverageId: number,
    policy: InsurancePolicy
  ) => {
    try {
      // Upload front card
      if (policy.cardFrontFile) {
        const frontFormData = new FormData();
        frontFormData.append("file", policy.cardFrontFile);

        const frontResponse = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/coverages/${coverageId}/card/front`,
          {
            method: "POST",
            body: frontFormData,
          }
        );

        if (!frontResponse.ok) {
          console.warn("Failed to upload front card image");
        } else {
          const frontResult = await frontResponse.json();
          console.log("Front card uploaded:", frontResult);
        }
      }

      // Upload back card
      if (policy.cardBackFile) {
        const backFormData = new FormData();
        backFormData.append("file", policy.cardBackFile);

        const backResponse = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/coverages/${coverageId}/card/back`,
          {
            method: "POST",
            body: backFormData,
          }
        );

        if (!backResponse.ok) {
          console.warn("Failed to upload back card image");
        } else {
          const backResult = await backResponse.json();
          console.log("Back card uploaded:", backResult);
        }
      }
    } catch (err) {
      console.error("Error uploading insurance cards:", err);
      // Don't fail the whole save operation if card upload fails
    }
  };

  /**
   * Handle insurance card file selection
   */
  const handleCardFileChange = (
    level: Level,
    side: "front" | "back",
    file: File | null
  ) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setAlert({
        variant: "error",
        title: "Invalid File Type",
        message: "Please upload a PNG, JPEG, or PDF file.",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAlert({
        variant: "error",
        title: "File Too Large",
        message: "File size must be less than 5MB.",
      });
      return;
    }

    // Update policy with file
    setPolicies((prev) => ({
      ...prev,
      [level]: {
        ...prev[level],
        [side === "front" ? "cardFrontFile" : "cardBackFile"]: file,
      },
    }));

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCardPreviews((prev) => ({
          ...prev,
          [side]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Add a new insurance company
   */
  const handleAddCompany = async () => {
    try {
      // Validate required fields
      if (!newCompany.name || !newCompany.address || !newCompany.city || 
          !newCompany.state || !newCompany.postalCode || !newCompany.payerId) {
        setAlert({
          variant: "error",
          title: "Missing Fields",
          message: "Please fill in all required fields (Name, Address, City, State, Postal Code, Payer ID).",
        });
        return;
      }

      const response = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/insurance-companies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newCompany),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add insurance company");
      }

      const result = await response.json();
      const addedCompany = result.data || result;

      // Add to companies list
      setCompanies((prev) => [...prev, addedCompany]);

      // Auto-select the new company if we're editing
      if (editLevel) {
        setPolicies((prev) => ({
          ...prev,
          [editLevel]: {
            ...prev[editLevel],
            providerId: addedCompany.id,
          },
        }));
      }

      // Reset modal
      setShowAddCompanyModal(false);
      setNewCompany({
        name: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "USA",
        payerId: "",
        phone: "",
      });

      setAlert({
        variant: "success",
        title: "Company Added",
        message: `${addedCompany.name} has been added successfully.`,
      });
    } catch (err) {
      console.error("Failed to add insurance company", err);
      setAlert({
        variant: "error",
        title: "Error",
        message: "Failed to add insurance company. Please try again.",
      });
    }
  };

  /**
   * Small helpers for UI look/feel
   */
  const getInsuranceIcon = (level: Level) => {
    switch (level) {
      case "primary":
        return "🛡️";
      case "secondary":
        return "🛡️‍🟡";
      case "tertiary":
        return "🛡️‍🔵";
    }
  };

  const getInsuranceColor = () => {
    // Single mild slate color for all insurance cards
    return "from-slate-500 to-slate-600";
  };

  const handleEditInsurance = (level: Level) => {
    setEditLevel(level);
    // Reset card previews when opening edit
    setCardPreviews({ front: null, back: null });
  };

  const handleArchiveInsurance = async (level: Level) => {
    const coverageId = coverageIds[level];
    if (!coverageId) {
      setAlert({
        variant: "warning",
        title: "No Coverage",
        message: `No ${level} insurance coverage found to archive.`,
      });
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to archive your ${level} insurance coverage? This will mark it as inactive but preserve the record for compliance.`
      )
    ) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/coverages/${coverageId}/archive`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to archive coverage: ${response.statusText}`);
      }

      console.log(`${level} coverage archived successfully`);

      // Clear the coverage data for this level
      setPolicies((prev) => ({
        ...prev,
        [level]: { ...initialPolicy },
      }));
      setCoverageIds((prev) => ({
        ...prev,
        [level]: null,
      }));

      setAlert({
        variant: "success",
        title: "Archived",
        message: `Your ${level} insurance coverage was archived successfully.`,
      });

      await refetch();
    } catch (err) {
      console.error("Failed to archive coverage", err);
      setAlert({
        variant: "error",
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to archive insurance information. Please try again.",
      });
    }
  };

  const handleAddInsurance = (level: Level) => {
    setEditLevel(level);
  };

  /**
   * Read-only card vs. edit form for each level
   */
  const renderInsuranceSection = (level: Level, title: string) => {
    const p = policies[level];
    const isConfigured = p.providerId && p.planName;

    if (editLevel === level) {
      return renderForm(level, title);
    }

    // Use byholderName for policyholder display
    const subscriberFullName = p.byholderName || "";

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-200">
        {/* Header with gradient and icon */}
        <div className={`bg-linear-to-r ${getInsuranceColor()} p-3 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">{getInsuranceIcon(level)}</div>
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  {title.toUpperCase()} INSURANCE
                </h2>
                <p className="text-xs text-white/80">Coverage information</p>
              </div>
            </div>
            {isConfigured && (
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                ACTIVE
              </span>
            )}
          </div>
        </div>

        {isConfigured ? (
          <div className="p-4">
            {/* Insurance Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Insurance Provider */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Insurance Provider
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {companies.find((c) => c.id === p.providerId)?.name ||
                    "Unknown"}
                </span>
              </div>

              {/* Plan Name */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Plan Name
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {p.planName}
                </span>
              </div>

              {/* Member ID */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Member ID
                </span>
                <span className="text-sm font-mono font-light text-gray-900 dark:text-white">
                  {p.policyNumber}
                </span>
              </div>

              {/* Group Number */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Group Number
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {p.groupNumber || "N/A"}
                </span>
              </div>

              {/* Coverage Status */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Coverage Status
                </span>
                <div className="flex items-center space-x-1.5">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-light text-green-600 dark:text-green-400">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Coverage Start */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Coverage Start
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {p.effectiveDate || "—"}
                </span>
              </div>

              {/* Coverage End */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Coverage End
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {p.effectiveDateEnd || "-"}
                </span>
              </div>

              {/* Copay Amount */}
              <div className="flex flex-col space-y-1 md:col-span-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Copay Amount
                </span>
                <span className="text-lg font-light text-blue-600 dark:text-blue-400">
                  {p.copay ? `$${p.copay}` : "Not specified"}
                </span>
              </div>

              {/* Subscriber Name (show only when present) */}
              {subscriberFullName ? (
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Subscriber Name
                  </span>
                  <span className="text-sm font-light text-gray-900 dark:text-white">
                    {subscriberFullName}
                  </span>
                </div>
              ) : null}

              {/* Subscriber Relationship (show only when present) */}
              {p.byholderRelation ? (
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Relationship to Patient
                  </span>
                  <span className="text-sm font-light text-gray-900 dark:text-white">
                    {p.byholderRelation}
                  </span>
                </div>
              ) : null}

              {/* Subscriber Phone */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Subscriber Phone
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {p.subscriberPhone || "—"}
                </span>
              </div>

              {/* Subscriber Employer */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Subscriber Employer
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {p.subscriberEmployer || "—"}
                </span>
              </div>

              {/* Subscriber Address Line 1 */}
              <div className="flex flex-col space-y-1 md:col-span-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Address Line 1
                </span>
                <span className="text-sm font-light text-gray-900 dark:text-white">
                  {p.subscriberAddressLine1 || "—"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-end space-x-2">
                {/* Edit Button */}
                <button
                  onClick={() => handleEditInsurance(level)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 transition-all duration-200 text-sm font-medium"
                  title="Edit insurance"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Edit</span>
                </button>

                {/* Archive Button */}
                <button
                  onClick={() => handleArchiveInsurance(level)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30 transition-all duration-200 text-sm font-medium"
                  title="Archive insurance"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  <span>Archive</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="mb-4">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              No {title.toLowerCase()} insurance has been added yet.
            </p>
            <button
              onClick={() => handleAddInsurance(level)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add {title} Insurance</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  /**
   * Edit form for a single insurance level
   */
  const renderForm = (level: Level, title: string) => {
    const p = policies[level];

    const subscriberSectionSubtitle =
      level === "primary"
        ? "The subscriber is the person who owns this insurance policy. Often this is you, but it may also be a spouse, parent, or guardian."
        : "The subscriber is the person who owns this insurance policy (for this coverage level).";

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className={`bg-linear-to-r ${getInsuranceColor()} p-4 text-white`}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getInsuranceIcon(level)}</div>
            <div>
              <h3 className="text-lg font-bold">
                Edit {title} Insurance Coverage
              </h3>
              <p className="text-blue-100 text-sm">
                Update your insurance and subscriber information
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(level);
          }}
          className="p-6 space-y-6"
        >
          {/* Insurance basic details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Insurance Provider */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Insurance Provider *
              </label>
              <div className="flex items-start gap-3">
                {/* Company Dropdown */}
                <select
                  name="providerId"
                  value={p.providerId ?? ""}
                  onChange={(e) => handleChange(e, level)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Select Insurance Provider</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Compact Add New Button */}
                <button
                  type="button"
                  onClick={() => {
                    setNewCompany({
                      name: "",
                      address: "",
                      city: "",
                      state: "",
                      postalCode: "",
                      country: "USA",
                      payerId: "",
                      phone: "",
                    });
                    setShowAddCompanyModal(true);
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 
                             rounded-md border border-gray-300 
                             text-gray-700 hover:bg-gray-100 
                             dark:border-gray-600 dark:text-gray-300 
                             dark:hover:bg-gray-700 
                             text-sm font-medium transition whitespace-nowrap"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path 
                      d="M12 8v8m4-4H8" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <circle 
                      cx="12" 
                      cy="12" 
                      r="9" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  
                  <span>Add New</span>
                </button>
              </div>
            </div>

            {/* Plan Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Plan Name *
              </label>
              <input
                type="text"
                name="planName"
                placeholder="e.g., PPO Plus, HMO Gold"
                value={p.planName}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors font-light"
                required
              />
            </div>

            {/* Member ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Member ID
              </label>
              <input
                type="text"
                name="policyNumber"
                placeholder="Enter member ID"
                value={p.policyNumber}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors font-mono font-light"
              />
            </div>

            {/* Group Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Group Number
              </label>
              <input
                type="text"
                name="groupNumber"
                placeholder="Enter group number (if applicable)"
                value={p.groupNumber}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors font-light"
              />
            </div>

            {/* Copay */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Copay Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                  $
                </span>
                <input
                  type="text"
                  name="copay"
                  placeholder="0.00"
                  value={p.copay}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors font-light"
                  required
                />
              </div>
            </div>

            {/* Effective Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Effective Date *
              </label>
              <input
                type="date"
                name="effectiveDate"
                value={p.effectiveDate}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors font-light"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Expiration Date *
              </label>
              <input
                type="date"
                name="effectiveDateEnd"
                value={p.effectiveDateEnd}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors font-light"
                required
              />
            </div>

            {/* Medicare Type (only for secondary) */}
            {level === "secondary" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Medicare Type
                </label>
                <select
                  name="secondaryMedicareType"
                  value={p.secondaryMedicareType}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                >
                  <option value="N/A">Not Applicable</option>
                  <option value="Part A">Medicare Part A</option>
                  <option value="Part B">Medicare Part B</option>
                </select>
              </div>
            )}
          </div>

          {/* ========== INSURANCE CARD UPLOAD ========== */}
          <div className="border-t dark:border-gray-700 pt-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Insurance Card Images
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload clear images of the front and back of your insurance card. Accepted formats: PNG, JPEG, PDF (max 5MB each).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Front Card Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Front of Insurance Card
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleCardFileChange(level, "front", file);
                    }}
                    className="hidden"
                    id={`card-front-${level}`}
                  />
                  <label
                    htmlFor={`card-front-${level}`}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {p.cardFrontUrl || cardPreviews.front ? (
                      <div className="text-center">
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Card Uploaded
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPEG, PDF (max 5MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {p.cardFrontUrl && (
                  <a
                    href={p.cardFrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                  >
                    View current card
                  </a>
                )}
              </div>

              {/* Back Card Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Back of Insurance Card
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleCardFileChange(level, "back", file);
                    }}
                    className="hidden"
                    id={`card-back-${level}`}
                  />
                  <label
                    htmlFor={`card-back-${level}`}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {p.cardBackUrl || cardPreviews.back ? (
                      <div className="text-center">
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Card Uploaded
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPEG, PDF (max 5MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {p.cardBackUrl && (
                  <a
                    href={p.cardBackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                  >
                    View current card
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ========== SUBSCRIBER INFORMATION (ALL LEVELS) ========== */}
          <div className="border-t dark:border-gray-700 pt-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Subscriber Information
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {subscriberSectionSubtitle}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Policyholder Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Policyholder Name
                </label>
                <input
                  type="text"
                  name="byholderName"
                  placeholder="Full name of policyholder"
                  value={p.byholderName}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the full name as it appears on the insurance card.</p>
              </div>

              {/* Relationship to Patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relationship to Patient *
                </label>
                <select
                  value={p.byholderRelation}
                  onChange={(e) =>
                    handleSubscriberRelationChange(level, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Select relationship</option>
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Guardian">Legal Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Subscriber Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subscriber Phone
                </label>
                <input
                  type="tel"
                  name="subscriberPhone"
                  placeholder="(555) 123-4567"
                  value={p.subscriberPhone}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              {/* Employer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subscriber Employer
                </label>
                <input
                  type="text"
                  name="subscriberEmployer"
                  placeholder="Employer name"
                  value={p.subscriberEmployer}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              {/* Address Line 1 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address Line 1
                </label>
                <input
                  type="text"
                  name="subscriberAddressLine1"
                  placeholder="Street address"
                  value={p.subscriberAddressLine1}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="subscriberAddressLine2"
                  placeholder="Apt, suite, unit, etc. (optional)"
                  value={p.subscriberAddressLine2}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="subscriberCity"
                  placeholder="City"
                  value={p.subscriberCity}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="subscriberState"
                  placeholder="State (e.g., CA)"
                  maxLength={2}
                  value={p.subscriberState}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors uppercase"
                />
              </div>

              {/* Zip Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zip Code
                </label>
                <input
                  type="text"
                  name="subscriberZipCode"
                  placeholder="Zip code"
                  value={p.subscriberZipCode}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="subscriberCountry"
                  placeholder="Country"
                  value={p.subscriberCountry}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => setEditLevel(null)}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save Insurance
            </button>
          </div>
        </form>
      </div>
    );
  };

  /**
   * Loading & error screens
   */
  if (loading || !mounted) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-yellow-600 mr-3 mt-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Unable to Load Insurance Information
                </h3>
                <p className="text-yellow-700 mb-3">
                  We could not retrieve your insurance data at this time. This
                  might be because your patient record has not been linked to
                  the EHR system yet, or you do not have permission to view this
                  data.
                </p>
                <p className="text-sm text-yellow-600">
                  Please contact your healthcare provider if you believe you
                  should have access to this information.
                </p>
                <div className="mt-4 text-xs text-yellow-500">
                  Technical details: {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // NOTE: Do not block rendering based on patientId extracted client-side.
  // The patient portal endpoint `/api/fhir/insurance/my` is authenticated
  // server-side and maps the portal user (email in the JWT) to the EHR
  // patient record. Rely on the backend response to determine access.

  return (
    <AdminLayout>
      {/* Header Card: dynamic patient info */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 mb-6 border border-blue-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                  Insurance Coverage
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Patient:
                  </span>
                  <span className="font-light text-gray-600 dark:text-gray-400">
                    {patientInfo.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    EHR Patient ID:
                  </span>
                  <span className="font-light text-gray-600 dark:text-gray-400">
                    {patientInfo.ehrPatientId ?? "—"}
                  </span>
                </div>
              </div>

              {/* Insurance summary */}
              <div className="mt-4 pt-4 border-t border-blue-100 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Total Coverages:
                    </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {coverages?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Primary Plan:
                    </span>
                    <span className="font-light text-gray-600 dark:text-gray-400">
                      {(coverages || []).find(
                        (c) =>
                          (c.coverageType || "").toLowerCase() === "primary"
                      )?.planName || "None"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Providers:
                    </span>
                    <span className="font-light text-gray-600 dark:text-gray-400">
                      {Array.from(
                        new Set(
                          (coverages || [])
                            .map((c) => c.insuranceCompany?.name)
                            .filter(Boolean)
                        )
                      ).join(", ") || "None"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Display */}
      {alert && (
        <div className="px-6">
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
          />
        </div>
      )}

      {/* Stacked rows: primary, secondary, tertiary */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex flex-col space-y-6">
          <div>{renderInsuranceSection("primary", "Primary")}</div>
          <div>{renderInsuranceSection("secondary", "Secondary")}</div>
          <div>{renderInsuranceSection("tertiary", "Tertiary")}</div>
        </div>
      </div>

      {/* Add Insurance Company Modal */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <h3 className="text-xl font-bold">Add Insurance Company</h3>
                </div>
                <button
                  onClick={() => setShowAddCompanyModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter the insurance company information. All fields marked with * are required.
              </p>

              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={newCompany.name || ""}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    placeholder="e.g., Blue Cross Blue Shield"
                    required
                  />
                </div>

                {/* Payer ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payer ID *
                  </label>
                  <input
                    type="text"
                    value={newCompany.payerId || ""}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, payerId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    placeholder="e.g., 12345"
                    required
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={newCompany.address || ""}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    placeholder="Street address"
                    required
                  />
                </div>

                {/* City, State, Postal Code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={newCompany.city || ""}
                      onChange={(e) =>
                        setNewCompany({ ...newCompany, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                      placeholder="City"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={newCompany.state || ""}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          state: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors uppercase"
                      placeholder="State"
                      maxLength={2}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={newCompany.postalCode || ""}
                      onChange={(e) =>
                        setNewCompany({ ...newCompany, postalCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                      placeholder="Zip"
                      required
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={newCompany.country || "USA"}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, country: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    placeholder="Country"
                    required
                  />
                </div>

                {/* Phone (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={newCompany.phone || ""}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCompany}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Company
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
