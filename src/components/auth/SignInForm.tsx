"use client";
import { getEnv } from "@/utils/env";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

type Step = "email" | "authenticate" | "change-password";

interface DiscoverResult {
    exists: boolean;
    authMethods: string[];
    idps: Array<{ alias: string; displayName: string; providerId: string }>;
    orgAlias: string;
    orgName: string;
}

export default function SignInForm() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);

    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "";
    const keycloakUrl = getEnv("NEXT_PUBLIC_KEYCLOAK_URL");
    const keycloakRealm = getEnv("NEXT_PUBLIC_KEYCLOAK_REALM");
    const keycloakClientId = getEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded: { exp: number } = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    router.push("/dashboard");
                }
            } catch {
                // Invalid token, proceed to login
            }
        }
    }, [router]);

    const handlePostLogin = useCallback(async (data: {
        token: string;
        refreshToken?: string;
        email: string;
        username: string;
        firstName: string;
        lastName: string;
        groups: string[];
        userId: string;
        patientFhirId?: string;
    }) => {
        // Normalize roles
        const rolesUpper = Array.isArray(data.groups)
            ? data.groups.map((g: string) => g?.toUpperCase())
            : [];
        const isPatient = rolesUpper.includes("PATIENT");

        // For PATIENT role, ensure patientFhirId is set.
        // Keycloak-authenticated patients may not have patientFhirId in the login
        // response — use userId as fallback since the backend resolves patient
        // data from the JWT email claim anyway.
        if (isPatient && !data.patientFhirId) {
            data.patientFhirId = data.userId || (data as any).sub || "";
        }

        const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.username || "";

        localStorage.setItem("token", data.token);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("userEmail", data.email || data.username || "");
        localStorage.setItem("userFullName", fullName);
        localStorage.setItem("userId", String(data.userId || ""));
        localStorage.setItem("groups", JSON.stringify(data.groups || []));
        localStorage.setItem("authMethod", data.patientFhirId ? "portal" : "keycloak");
        localStorage.setItem("user", JSON.stringify(data));
        if (data.patientFhirId) localStorage.setItem("patientFhirId", data.patientFhirId);

        // Extract and store orgAlias from JWT or login data
        try {
            const payload = JSON.parse(atob(data.token.split(".")[1]));
            const org = Array.isArray(payload.organization) ? payload.organization[0] : (payload.organization || payload.org_alias || "");
            if (org) localStorage.setItem("orgAlias", org);
        } catch { /* ignore JWT parse errors */ }

        if (data.groups && data.groups.length > 0) {
            const systemGroups = ['offline_access', 'uma_authorization', 'default-roles-ciyex', 'default-roles-master'];
            const meaningful = data.groups.find((g: string) => !systemGroups.includes(g.toLowerCase()));
            localStorage.setItem("primaryGroup", meaningful || data.groups[0]);
        }

        // Notify contexts that token is available
        window.dispatchEvent(new CustomEvent("auth-token-set", { detail: { key: "token" } }));

        router.replace("/dashboard");
    }, [router]);

    const handleDiscover = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${apiUrl}/api/auth/discover`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });

            if (!res.ok) {
                setError("Unable to verify your account. Please try again.");
                setLoading(false);
                return;
            }

            const data: DiscoverResult = await res.json();
            setDiscoverResult(data);

            if (!data.exists) {
                // User not in Keycloak — may still be a portal-registered user (FHIR Person)
                // Proceed to password step with password-only auth
                setDiscoverResult({ ...data, exists: true, authMethods: ["password"], idps: [] });
            }

            setStep("authenticate");
            setLoading(false);
        } catch {
            setError("Unable to connect to the server. Please try again.");
            setLoading(false);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) return;

        setLoading(true);
        setError("");

        let keycloakError = "";

        try {
            // Try Keycloak auth first (provider-created patients)
            try {
                const res = await fetch(`${apiUrl}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email.trim(), password }),
                });

                // Safely parse JSON — backend may return HTML error pages
                const text = await res.text();
                let data: any = {};
                try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON response */ }

                if (data.success && data.data?.token) {
                    const loginData = data.data;
                    if (!loginData.patientFhirId) {
                        const groups = Array.isArray(loginData.groups) ? loginData.groups : [];
                        const isPatient = groups.some((g: string) => g?.toUpperCase() === "PATIENT");
                        if (isPatient) {
                            loginData.patientFhirId = loginData.userId || loginData.sub || loginData.fhirId || "";
                        }
                    }
                    await handlePostLogin(loginData);
                    return;
                }

                // Check if temp password requires change
                if (data.requiresPasswordChange) {
                    setStep("change-password");
                    setError("");
                    setLoading(false);
                    return;
                }

                keycloakError = data.error || data.message || "";
            } catch {
                // Keycloak auth unavailable — fall through to portal auth
            }

            // Fallback: try portal auth (self-registered patients via FHIR Person)
            const portalRes = await fetch(`${apiUrl}/api/portal/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            const portalText = await portalRes.text();
            let portalData: any = {};
            try { portalData = portalText ? JSON.parse(portalText) : {}; } catch { /* non-JSON */ }

            if (portalData.success && portalData.data?.token) {
                const pd = portalData.data;
                await handlePostLogin({
                    token: pd.token,
                    email: pd.email || email.trim(),
                    username: pd.email || email.trim(),
                    firstName: pd.firstName || "",
                    lastName: pd.lastName || "",
                    groups: ["PATIENT"],
                    userId: pd.fhirId || String(pd.id || ""),
                    patientFhirId: pd.fhirId || undefined,
                });
                return;
            }

            setError(portalData.message || keycloakError || "Invalid email or password");
            setLoading(false);
        } catch {
            setError("Unable to connect. Please try again.");
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) return;

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${apiUrl}/api/auth/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    currentPassword: password,
                    newPassword,
                }),
            });

            const text = await res.text();
            let data: any = {};
            try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }

            if (data.success && data.data?.token) {
                const loginData = data.data;
                if (!loginData.patientFhirId) {
                    const groups = Array.isArray(loginData.groups) ? loginData.groups : [];
                    const isPatient = groups.some((g: string) => g?.toUpperCase() === "PATIENT");
                    if (isPatient) {
                        loginData.patientFhirId = loginData.userId || loginData.sub || loginData.fhirId || "";
                    }
                }
                await handlePostLogin(loginData);
                return;
            }

            setError(data.error || data.message || "Failed to change password. Please try again.");
            setLoading(false);
        } catch {
            setError("Unable to connect. Please try again.");
            setLoading(false);
        }
    };

    const handleIdpLogin = async (idpAlias: string) => {
        if (!keycloakUrl || !keycloakRealm || !keycloakClientId) return;

        setLoading(true);
        try {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const codeVerifier = btoa(String.fromCharCode(...array))
                .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

            const encoder = new TextEncoder();
            const hash = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
            const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
                .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

            sessionStorage.setItem("pkce_code_verifier", codeVerifier);

            const redirectUri = window.location.origin + "/callback";
            const authUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth`;
            const params = new URLSearchParams({
                client_id: keycloakClientId,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: "openid profile email organization",
                code_challenge: codeChallenge,
                code_challenge_method: "S256",
                kc_idp_hint: idpAlias,
                login_hint: email,
            });

            window.location.href = `${authUrl}?${params.toString()}`;
        } catch {
            setError("Failed to initiate sign-in. Please try again.");
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep("email");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowNewPassword(false);
        setError("");
        setDiscoverResult(null);
    };

    return (
        <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 dark:bg-gray-900">
            {/* Left Column: Branding */}
            <div className="hidden lg:flex flex-col items-center justify-center p-12 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #06b6d4 100%)" }}>
                <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                <div className="z-10 flex flex-col items-center max-w-lg">
                    <img src="/images/logo/logo-icon.svg" alt="Ciyex" className="w-20 h-20 mb-6 drop-shadow-lg" />
                    <h1 className="text-4xl font-bold mb-3 text-center tracking-tight">Ciyex Portal</h1>
                    <p className="text-base text-white/80 text-center font-light mb-8">
                        Your Health. Your Control.
                    </p>
                    <div className="space-y-3 w-full">
                        {[
                            { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", label: "Access your medical records anytime" },
                            { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", label: "View & manage your appointments" },
                            { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "HIPAA-compliant & secure" },
                            { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", label: "Message your care team" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm">
                                <svg className="w-5 h-5 text-white/90 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                </svg>
                                <span className="text-sm text-white/90">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Sign-In Form */}
            <div className="flex items-center justify-center p-6 sm:p-12 w-full bg-gray-50 dark:bg-gray-900">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden text-center mb-10">
                        <img src="/images/logo/logo-icon.svg" alt="Ciyex" className="w-14 h-14 mx-auto mb-3" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ciyex Portal</h1>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                        {step === "email" && (
                            <>
                                <div className="mb-6 text-center">
                                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Sign In</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Enter your email to continue
                                    </p>
                                </div>

                                <form onSubmit={handleDiscover} className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={loading}
                                            autoComplete="email"
                                            autoFocus
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                                        />
                                    </div>

                                    {error && (
                                        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                                            {error}
                                            {!discoverResult?.exists && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push("/signup")}
                                                    className="block mt-2 text-purple-600 dark:text-purple-400 hover:underline font-medium"
                                                >
                                                    Create an account
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !email.trim()}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-all duration-200"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Checking...
                                            </>
                                        ) : (
                                            "Continue"
                                        )}
                                    </button>
                                </form>
                            </>
                        )}

                        {step === "authenticate" && (
                            <>
                                <div className="mb-6">
                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back
                                    </button>
                                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Welcome back</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {email}
                                        {discoverResult?.orgName && (
                                            <span className="block text-xs mt-0.5">{discoverResult.orgName}</span>
                                        )}
                                    </p>
                                </div>

                                {/* Password form */}
                                {discoverResult?.authMethods?.includes("password") && (
                                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter your password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    disabled={loading}
                                                    autoComplete="current-password"
                                                    autoFocus
                                                    required
                                                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading || !password}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-all duration-200"
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Signing in...
                                                </>
                                            ) : (
                                                "Sign in"
                                            )}
                                        </button>
                                    </form>
                                )}

                                {/* IDP buttons */}
                                {discoverResult?.idps && discoverResult.idps.length > 0 && (
                                    <>
                                        {discoverResult.authMethods?.includes("password") && (
                                            <div className="relative my-5">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gray-200 dark:border-gray-600" />
                                                </div>
                                                <div className="relative flex justify-center text-xs">
                                                    <span className="bg-white dark:bg-gray-800 px-3 text-gray-500 dark:text-gray-400">or continue with</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {discoverResult.idps.map((idp) => (
                                                <button
                                                    key={idp.alias}
                                                    type="button"
                                                    onClick={() => handleIdpLogin(idp.alias)}
                                                    disabled={loading}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                                                >
                                                    {idp.providerId === "google" && (
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                        </svg>
                                                    )}
                                                    {idp.providerId === "microsoft" && (
                                                        <svg className="w-4 h-4" viewBox="0 0 21 21">
                                                            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                                                            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                                                            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                                                            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                                                        </svg>
                                                    )}
                                                    {idp.displayName || idp.alias}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {step === "change-password" && (
                            <>
                                <div className="mb-6">
                                    <button
                                        onClick={() => { setStep("authenticate"); setNewPassword(""); setConfirmPassword(""); setError(""); }}
                                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back
                                    </button>
                                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Set New Password</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Your password has been reset. Please set a new password to continue.
                                    </p>
                                </div>

                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="newPassword"
                                                type={showNewPassword ? "text" : "password"}
                                                placeholder="Enter new password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                disabled={loading}
                                                autoComplete="new-password"
                                                autoFocus
                                                required
                                                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                tabIndex={-1}
                                            >
                                                {showNewPassword ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Confirm Password
                                        </label>
                                        <input
                                            id="confirmPassword"
                                            type={showNewPassword ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={loading}
                                            autoComplete="new-password"
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                                        />
                                    </div>

                                    {error && (
                                        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !newPassword || !confirmPassword}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-all duration-200"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Setting password...
                                            </>
                                        ) : (
                                            "Set Password & Sign In"
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    <div className="mt-6 text-center space-y-2">
                        <a
                            href="/signup"
                            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
                        >
                            New patient? Create an account
                        </a>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            By signing in, you agree to our{" "}
                            <a href="https://ciyex.org/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline dark:text-purple-400">Terms</a>
                            {" & "}
                            <a href="https://ciyex.org/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline dark:text-purple-400">Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
