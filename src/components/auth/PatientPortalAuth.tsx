"use client";

import { getEnv } from "@/utils/env";
import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import ReCAPTCHA from "react-google-recaptcha";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

// Types from backend
interface Org {
    orgId: number;
    orgName: string;
    roles: string[];
    facilities: {
        facilityId: number;
        facilityName: string;
        roles: string[];
    }[];
}

interface LoginResponse {
    success: boolean;
    message: string;
    data?: {
        firstName: string;
        lastName: string;
        phone: string;
        dateOfBirth: number[];
        email: string;
        token: string;
        orgs: Org[];
        orgIds: number[];
        city?: string;
        state?: string;
        country?: string;
        street?: string;
        street2?: string;
        postalCode?: string;
        securityQuestion?: string;
        securityAnswer?: string;
    };
}

function normalizeDob(dob?: number[]): string {
    if (!dob || dob.length < 3) return "";
    const [year, month, day] = dob;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function PatientPortalAuth() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [captcha, setCaptcha] = useState<string | null>(null);

    const [loginForm, setLoginForm] = useState({
        email: "",
        password: "",
    });

    const [signupForm, setSignupForm] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        dob: "",
        email: "",
        phone: "",
        password: "",
    });

    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "";

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSignupForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCaptcha = (value: string | null) => {
        setCaptcha(value);
    };

    // LOGIN HANDLER
    const handleSignIn = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetchWithAuth(`${apiUrl}/api/portal/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    email: loginForm.email,
                    password: loginForm.password,
                }),
            });

            const data: LoginResponse = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `Login failed: HTTP ${res.status}`);
            }

            if (data.success && data.data) {
                const {
                    token,
                    email,
                    firstName,
                    lastName,
                    phone,
                    dateOfBirth,
                    orgs,
                    orgIds,
                } = data.data;

                const fullName = `${firstName} ${lastName}`.trim();
                const org = orgs[0];
                const role = org.roles?.[0] || "PATIENT";

                // Save to localStorage
                localStorage.setItem("orgIds", JSON.stringify(orgIds));
                localStorage.setItem("token", token);
                localStorage.setItem("userEmail", email);
                localStorage.setItem("userFullName", fullName);
                localStorage.setItem("orgId", org.orgId.toString());
                localStorage.setItem("role", role);

                if (org.facilities?.length > 0) {
                    localStorage.setItem("facilityId", org.facilities[0].facilityId.toString());
                }

                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        ...data.data,
                        firstName,
                        lastName,
                        email,
                        phone,
                        fullName,
                        profileImage: "/images/user/owner.jpg",
                        dateOfBirth: normalizeDob(dateOfBirth),
                        orgName: org.orgName,
                        role,
                    })
                );

                // Redirect to dashboard
                router.push("/dashboard");
            } else {
                setError(data.message || "Invalid credentials");
            }
        } catch (err) {
            console.error("🚨 Login error:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // SIGNUP HANDLER
    const handleSignUp = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetchWithAuth(`${apiUrl}/api/portal/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    firstName: signupForm.firstName,
                    middleName: signupForm.middleName,
                    lastName: signupForm.lastName,
                    dateOfBirth: signupForm.dob,
                    email: signupForm.email,
                    phoneNumber: signupForm.phone,
                    password: signupForm.password,
                    captcha,
                }),
            });

            const data: LoginResponse = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `Signup failed: HTTP ${res.status}`);
            }

            if (data.success && data.data) {
                // Similar logic to login for setting up user state
                router.push("/dashboard");
            } else {
                setError(data.message || "Signup failed");
            }
        } catch (err) {
            console.error("🚨 Signup error:", err);
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center relative px-4"
            style={{backgroundImage: "url('/images/patient-portal-bg.jpg')"}}
        >
            <div className="absolute inset-0 bg-white/70"></div>

            <div className="relative flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Left Panel */}
                <div className="hidden md:flex flex-col justify-center w-1/2 p-10 text-white relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-blue-600 via-indigo-700 to-cyan-500">
                    <h1 className="text-4xl font-extrabold mb-4">
                        Welcome to{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-400">
                            Ciyex Connect
                        </span>
                    </h1>
                    <h2 className="text-lg font-medium mb-8 text-gray-100">
                        Patient Portal – <span className="font-semibold">Your Health. Your Control.</span>
                    </h2>

                    {/* Features */}
                    <div className="space-y-6 text-base leading-relaxed font-medium">
                        <div className="flex items-center gap-3">
                            <span className="text-emerald-300">🩺</span>
                            Communicate securely with your care team
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sky-300">🔬</span>
                            View lab & imaging results quickly
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-pink-300">💊</span>
                            Request prescription refills anytime
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-indigo-300">📅</span>
                            Manage and reschedule appointments
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-yellow-300">📋</span>
                            Access & download health records
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 p-6 md:p-8 bg-white/90 backdrop-blur-md rounded-lg shadow-md space-y-8">
                    {/* Sign In */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
                            Sign In - View your Dashboard
                        </h2>
                        <form onSubmit={handleSignIn} className="space-y-4">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={loginForm.email}
                                onChange={handleLoginChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                required
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Password"
                                    value={loginForm.password}
                                    onChange={handleLoginChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-gray-500"
                                >
                                    {showPassword ? "👁️" : "🙈"}
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                            className="mt-2 w-full bg-white border border-gray-300 rounded-md py-2 flex items-center justify-center gap-2 text-xs font-medium hover:bg-gray-50"
                        >
                            <span>🔍</span> Sign in with Google
                        </button>
                    </div>

                    {/* Sign Up */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
                            Create Account
                        </h2>
                        <form onSubmit={handleSignUp} className="space-y-3 text-sm">
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    name="firstName"
                                    placeholder="First Name"
                                    value={signupForm.firstName}
                                    onChange={handleSignupChange}
                                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                                    required
                                />
                                <input
                                    name="middleName"
                                    placeholder="Middle Name"
                                    value={signupForm.middleName}
                                    onChange={handleSignupChange}
                                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                                />
                                <input
                                    name="lastName"
                                    placeholder="Last Name"
                                    value={signupForm.lastName}
                                    onChange={handleSignupChange}
                                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                                    required
                                />
                            </div>
                            <input
                                type="date"
                                name="dob"
                                value={signupForm.dob}
                                onChange={handleSignupChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                                required
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={signupForm.email}
                                    onChange={handleSignupChange}
                                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                                    required
                                />
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Phone"
                                    value={signupForm.phone}
                                    onChange={handleSignupChange}
                                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                                    required
                                />
                            </div>
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={signupForm.password}
                                onChange={handleSignupChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                                required
                            />

                            <div className="flex justify-center">
                                <ReCAPTCHA
                                    sitekey={getEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY") || "6Lc_DccrAAAAAOM3CVIEfqvGyqirsBZ32QhZuXYz"}
                                    onChange={handleCaptcha}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !captcha}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                            >
                                {loading ? "Creating Account..." : "Create Account"}
                            </button>
                        </form>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-3 text-xs text-red-600 border border-red-200 bg-red-50 py-2 px-3 rounded-md">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}