"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getPatientIdFromToken, getOrgIdsFromToken } from "@/utils/jwtHelper";
import { useInsurance } from "@/hooks/useInsurance";

type InsuranceCompany = {
  id: number;
  name: string;
};

type InsurancePolicy = {
  providerId: number | null;
  planName: string;
  effectiveDate: string;
  effectiveDateEnd: string;
  policyNumber: string;
  groupNumber: string;
  copay: string;
  acceptAssignment: "YES" | "NO";
  secondaryMedicareType: "N/A" | "Part A" | "Part B";
};

const initialPolicy: InsurancePolicy = {
  providerId: null,
  planName: "",
  effectiveDate: "",
  effectiveDateEnd: "",
  policyNumber: "",
  groupNumber: "",
  copay: "",
  acceptAssignment: "YES",
  secondaryMedicareType: "N/A",
};

type Level = "primary" | "secondary" | "tertiary";

type CoverageResponse = {
  id: number;
  coverageType: string;
  planName: string;
  policyNumber: string;
  groupNumber: string;
  coverageStartDate: string;
  coverageEndDate: string;
  copayAmount: number;
  insuranceCompany: {
    id: number;
    name: string;
  };
};

export default function InsurancePage() {
  const { coverages, loading, error, refetch } = useInsurance();
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [policies, setPolicies] = useState<Record<Level, InsurancePolicy>>({
    primary: { ...initialPolicy },
    secondary: { ...initialPolicy },
    tertiary: { ...initialPolicy },
  });
  const [editLevel, setEditLevel] = useState<Level | null>(null);
  const [alert, setAlert] = useState<{
    variant: "success" | "error" | "warning";
    title: string;
    message: string;
  } | null>(null);

  // Get patient and org info from JWT
  const patientId = getPatientIdFromToken();
  const orgIds = getOrgIdsFromToken();
  const orgId = orgIds.length > 0 ? orgIds[0] : null;

  // Load insurance companies
  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/insurance-companies`
        );
        const data = await res.json();
        setCompanies(data.data ?? []);
      } catch (err) {
        console.error("Failed to load companies", err);
        setAlert({
          variant: "error",
          title: "Loading Error",
          message: "Failed to load insurance companies. Please try again.",
        });
      }
    }
    loadCompanies();
  }, []);

  // Convert backend coverages to frontend format
  useEffect(() => {
    if (coverages.length > 0) {
      const existingPolicies: Record<Level, InsurancePolicy> = {
        primary: { ...initialPolicy },
        secondary: { ...initialPolicy },
        tertiary: { ...initialPolicy },
      };

      coverages.forEach((coverage: CoverageResponse) => {
        const level = coverage.coverageType?.toLowerCase() as Level;
        if (level && existingPolicies[level]) {
          existingPolicies[level] = {
            providerId: coverage.insuranceCompany?.id || null,
            planName: coverage.planName || "",
            effectiveDate: coverage.coverageStartDate || "",
            effectiveDateEnd: coverage.coverageEndDate || "",
            policyNumber: coverage.policyNumber || "",
            groupNumber: coverage.groupNumber || "",
            copay: coverage.copayAmount ? coverage.copayAmount.toString() : "",
            acceptAssignment: "YES", // Default value, not in CoverageDto
            secondaryMedicareType: "N/A", // Default value, not in CoverageDto
          };
        }
      });

      setPolicies(existingPolicies);
    }
  }, [coverages]);

  // Auto-dismiss alerts
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    level: Level
  ) => {
    const { name, value } = e.target;
    setPolicies((prev) => ({
      ...prev,
      [level]: { ...prev[level], [name]: value },
    }));
  };

  const handleSave = async (level: Level) => {
    if (!patientId || !orgId) {
      setAlert({
        variant: "error",
        title: "Authentication Error",
        message: "Unable to save insurance information. Please log in again.",
      });
      return;
    }

    try {
      const policy = policies[level];

      // Prepare the coverage data for the backend API
      const coverageData = {
        coverageType: level.toUpperCase(), // PRIMARY, SECONDARY, TERTIARY
        planName: policy.planName,
        policyNumber: policy.policyNumber,
        groupNumber: policy.groupNumber,
        coverageStartDate: policy.effectiveDate,
        coverageEndDate: policy.effectiveDateEnd,
        copayAmount: policy.copay ? parseFloat(policy.copay) : null,
        insuranceCompany: {
          id: policy.providerId
        },
        patientId: patientId, // Add patient ID from JWT
        // Note: acceptAssignment and secondaryMedicareType are not in CoverageDto
        // These might need to be added to the backend or handled differently
      };

      console.log(`Saving ${level} coverage:`, coverageData);

      // Save coverage using the coverage API
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/coverages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'orgId': orgId.toString() // Use orgId from JWT
          },
          body: JSON.stringify(coverageData)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save coverage: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Coverage saved successfully:', result);

      setAlert({
        variant: "success",
        title: "Insurance Updated",
        message: `Your ${level} insurance information has been saved successfully.`,
      });
      setEditLevel(null);

      // Refresh the insurance data
      await refetch();

    } catch (err) {
      console.error("Failed to save coverage", err);
      setAlert({
        variant: "error",
        title: "Save Failed",
        message: err instanceof Error ? err.message : "Failed to save insurance information. Please try again.",
      });
    }
  };

  const getInsuranceIcon = (level: Level) => {
    switch (level) {
      case "primary": return "🛡️";
      case "secondary": return "🛡️‍🟡";
      case "tertiary": return "🛡️‍🔵";
    }
  };

  const getInsuranceColor = (level: Level) => {
    switch (level) {
      case "primary": return "from-blue-500 to-blue-600";
      case "secondary": return "from-green-500 to-green-600";
      case "tertiary": return "from-purple-500 to-purple-600";
    }
  };

  const getStatusBadge = (policy: InsurancePolicy) => {
    if (!policy.providerId || !policy.planName) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Not Configured
        </span>
      );
    }

    const today = new Date();
    const endDate = new Date(policy.effectiveDateEnd);
    const isExpired = endDate < today;

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Active
      </span>
    );
  };

  const renderSummary = (level: Level, title: string) => {
    const p = policies[level];
    const isConfigured = p.providerId && p.planName;

    return (
      <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-xl ${
        isConfigured ? 'ring-2 ring-blue-500/20' : ''
      }`}>
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${getInsuranceColor(level)} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{getInsuranceIcon(level)}</div>
              <div>
                <h3 className="text-lg font-bold">{title} Insurance</h3>
                <p className="text-blue-100 text-sm">Coverage Information</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(p)}
              <button
                onClick={() => setEditLevel(level)}
                className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isConfigured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Insurance Provider</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {companies.find((c) => c.id === p.providerId)?.name || "Unknown Provider"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan Name</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{p.planName}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 7V3a2 2 0 012-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Policy Number</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white font-mono">{p.policyNumber}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Group Number</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{p.groupNumber || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Copay Amount</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{p.copay ? `$${p.copay}` : "Not specified"}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assignment Accepted</p>
                    <p className={`text-base font-semibold ${p.acceptAssignment === 'YES' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {p.acceptAssignment}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Insurance Configured</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Add your {title.toLowerCase()} insurance information to ensure proper billing and coverage.
              </p>
              <button
                onClick={() => setEditLevel(level)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Insurance
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderForm = (level: Level, title: string) => {
    const p = policies[level];
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getInsuranceColor(level)} p-4 text-white`}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getInsuranceIcon(level)}</div>
            <div>
              <h3 className="text-lg font-bold">Edit {title} Insurance</h3>
              <p className="text-blue-100 text-sm">Update your coverage information</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Insurance Provider */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Insurance Provider *
              </label>
              <select
                name="providerId"
                value={p.providerId ?? ""}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                required
              >
                <option value="">Select Insurance Provider</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan Name *
              </label>
              <input
                type="text"
                name="planName"
                placeholder="e.g., PPO Plus, HMO Gold"
                value={p.planName}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                required
              />
            </div>

            {/* Policy Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Policy Number *
              </label>
              <input
                type="text"
                name="policyNumber"
                placeholder="Enter policy number"
                value={p.policyNumber}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors font-mono"
                required
              />
            </div>

            {/* Group Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group Number
              </label>
              <input
                type="text"
                name="groupNumber"
                placeholder="Enter group number (if applicable)"
                value={p.groupNumber}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            {/* Copay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Copay Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  name="copay"
                  placeholder="0.00"
                  value={p.copay}
                  onChange={(e) => handleChange(e, level)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
            </div>

            {/* Effective Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Effective Date
              </label>
              <input
                type="date"
                name="effectiveDate"
                value={p.effectiveDate}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration Date
              </label>
              <input
                type="date"
                name="effectiveDateEnd"
                value={p.effectiveDateEnd}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            {/* Assignment Acceptance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Accept Assignment
              </label>
              <select
                name="acceptAssignment"
                value={p.acceptAssignment}
                onChange={(e) => handleChange(e, level)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="YES">Yes - Provider accepts insurance payment</option>
                <option value="NO">No - Patient pays provider directly</option>
              </select>
            </div>

            {/* Medicare Type (only for secondary) */}
            {level === 'secondary' && (
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
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Insurance
            </button>
          </div>
        </form>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
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
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-yellow-600 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Unable to Load Insurance Information</h3>
                <p className="text-yellow-700 mb-3">
                  We could not retrieve your insurance data at this time. This might be because your patient record has not been linked to the EHR system yet, or you do not have permission to view this data.
                </p>
                <p className="text-sm text-yellow-600">
                  Please contact your healthcare provider if you believe you should have access to this information.
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

  if (!patientId) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-red-600 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Required</h3>
                <p className="text-red-700 mb-3">
                  You must be logged in as a patient to view insurance information.
                </p>
                <p className="text-sm text-red-600">
                  Please log in to your patient portal account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 p-6 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
              <svg className="h-10 w-10 mr-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Insurance Information
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Manage your health insurance coverage and policy details • HIPAA Compliant
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800 dark:text-white">John Doe</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">DOB: 01/15/1980 • MRN: 123456</p>
          </div>
        </div>
      </div>

      {/* Insurance Cards */}
      <div className="max-w-5xl mx-auto space-y-6 px-6">
        {editLevel === "primary"
          ? renderForm("primary", "Primary")
          : renderSummary("primary", "Primary")}

        {editLevel === "secondary"
          ? renderForm("secondary", "Secondary")
          : renderSummary("secondary", "Secondary")}

        {editLevel === "tertiary"
          ? renderForm("tertiary", "Tertiary")
          : renderSummary("tertiary", "Tertiary")}
      </div>

      {/* Alert */}
      {alert && (
        <div className="max-w-5xl mx-auto mt-6 px-6">
          <div className={`p-4 rounded-lg border shadow-sm ${
            alert.variant === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
              : alert.variant === "error"
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200"
              : "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200"
          }`}>
            <div className="flex items-center">
              <svg className={`h-5 w-5 mr-3 ${
                alert.variant === "success" ? "text-green-600" :
                alert.variant === "error" ? "text-red-600" : "text-yellow-600"
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                  alert.variant === "success" ? "M5 13l4 4L19 7" :
                  alert.variant === "error" ? "M6 18L18 6M6 6l12 12" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                } />
              </svg>
              <div>
                <h4 className="font-semibold">{alert.title}</h4>
                <p className="text-sm mt-1">{alert.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
