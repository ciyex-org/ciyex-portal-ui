"use client";
import Button from "@/components/ui/button/Button";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface PortalLoginResponse {
  token: string;
  userId: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  orgs: Array<{
    orgId: number;
    orgName: string;
    role: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export default function SignInForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const keycloakEnabled = process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED === 'true';
    const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
    const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
    const keycloakClientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

    useEffect(() => {
        const token = localStorage.getItem("token");
        const authMethod = localStorage.getItem("authMethod");
        
        if (token && authMethod) {
            try {
                const decoded: { exp: number } = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    console.log("🔄 Valid token found, redirecting to dashboard");
                    router.push("/dashboard");
                } else {
                    console.log("⏰ Token expired, clearing auth data");
                    // Clear expired token
                    localStorage.removeItem("token");
                    localStorage.removeItem("authMethod");
                    localStorage.removeItem("userEmail");
                    localStorage.removeItem("userFullName");
                    localStorage.removeItem("userId");
                    localStorage.removeItem("groups");
                    localStorage.removeItem("primaryGroup");
                    localStorage.removeItem("user");
                    localStorage.removeItem("orgId");
                    localStorage.removeItem("orgs");
                }
            } catch (error) {
                console.log("❌ Invalid token, clearing auth data:", error);
                // Invalid token, clear auth data
                localStorage.removeItem("token");
                localStorage.removeItem("authMethod");
                localStorage.removeItem("userEmail");
                localStorage.removeItem("userFullName");
                localStorage.removeItem("userId");
                localStorage.removeItem("groups");
                localStorage.removeItem("primaryGroup");
                localStorage.removeItem("user");
                localStorage.removeItem("orgId");
                localStorage.removeItem("orgs");
            }
        }
    }, [router]);

    const generateCodeVerifier = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    const generateCodeChallenge = async (verifier: string) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hash)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    const handleKeycloakSignIn = async () => {
        if (!keycloakEnabled || !keycloakUrl || !keycloakRealm || !keycloakClientId) {
            console.error("Keycloak is not properly configured");
            return;
        }

        setLoading(true);

        try {
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            sessionStorage.setItem('pkce_code_verifier', codeVerifier);

            const redirectUri = window.location.origin + "/callback";
            const authUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth`;
            
            const params = new URLSearchParams({
                client_id: keycloakClientId,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: "openid profile email",
                code_challenge: codeChallenge,
                code_challenge_method: "S256",
            });

            window.location.href = `${authUrl}?${params.toString()}`;
        } catch (error) {
            console.error("Error during Keycloak sign-in:", error);
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleLocalSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLocalLoading(true);

        try {
            // Clear any old tokens
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            const payload = {
                email: form.email.trim(),
                password: form.password,
            };

            console.log("🔑 Sending login payload:", payload);

            const res = await fetch(`${API_BASE}/api/portal/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Login failed with ${res.status}`);
            }

            const data: ApiResponse<PortalLoginResponse> = await res.json();

            if (!data.success || !data.data) {
                throw new Error(data.message || "Login failed.");
            }

            const user = data.data;
            console.log("✅ Login success, user:", user);

            // Save token + user for later API calls
            // Persist token and basic user info. Do not persist org-level data
            // on the client; backend should derive tenancy from token or portal
            // user mapping.
            localStorage.setItem("token", user.token);
            localStorage.setItem("authMethod", "local");
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("userEmail", user.email);
            localStorage.setItem("userFullName", `${user.firstName} ${user.lastName}`.trim());
            localStorage.setItem("portalUserId", user.userId.toString());

            // Redirect after login
            router.replace("/dashboard");
        } catch (err: unknown) {
            console.error("Sign in error:", err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Login failed.");
            }
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 dark:bg-gray-900">
            {/* Left Column: Branding */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-linear-to-br from-purple-900 via-blue-700 to-cyan-500 p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-20"></div>
                <div className="z-10 flex flex-col items-center">
                    <div className="mb-8">
                        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-bold mb-4 text-center tracking-tight">
                        Ciyex Portal
                    </h1>
                    <p className="text-lg text-blue-100 max-w-md text-center font-light">
                        Your Health. Your Control. Access your medical records, appointments, and more.
                    </p>
                </div>
            </div>

            {/* Right Column: Sign-In Form */}
            <div className="flex items-center justify-center p-6 sm:p-12 w-full bg-gray-50 dark:bg-gray-900">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg mb-4">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ciyex Portal</h1>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
                                Secure Sign-In
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {keycloakEnabled ? 'Sign in with Aran (Keycloak)' : 'Use your Aran account or local credentials'}
                            </p>
                        </div>

                        {/* Keycloak Sign In Button */}
                        {keycloakEnabled && (
                            <div className="mb-6">
                                <Button 
                                    className="w-full flex items-center justify-center gap-3 py-3 text-base font-medium shadow-lg bg-blue-600 hover:bg-blue-700 text-white rounded-lg hover:shadow-xl transition-all duration-200" 
                                    size="md" 
                                    onClick={handleKeycloakSignIn}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Redirecting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                                            </svg>
                                            <span>Sign in with Aran</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Local Login Form (only when Keycloak is disabled) */}
                        {error && (
                            <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                                {error}
                            </div>
                        )}

                        {!keycloakEnabled && (
                            <form onSubmit={handleLocalSignIn} className="space-y-4">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    required
                                />
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Password"
                                        value={form.password}
                                        onChange={handleChange}
                                        className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2 text-xs text-blue-600 dark:text-blue-400"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>

                                <div className="flex justify-end">
                                    <a
                                        href="/forgot-password"
                                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        Forgot Password?
                                    </a>
                                </div>

                                <button
                                    type="submit"
                                    disabled={localLoading}
                                    className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition disabled:opacity-50"
                                >
                                    {localLoading ? "Logging in..." : "Log In with Email"}
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="mt-6">
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                            Don&apos;t have an account?{" "}
                            <a href="/signup" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                Sign up
                            </a>
                        </p>
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                            By signing in, you agree to our{' '}
                            <a href="#" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                Terms
                            </a> & <a href="#" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                Privacy Policy
                            </a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
