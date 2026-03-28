"use client";
import { getEnv } from "@/utils/env";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");

    useEffect(() => {
        const handleCallback = async () => {
            // Get authorization code from URL
            const code = searchParams?.get("code");
            const errorParam = searchParams?.get("error");

            if (errorParam) {
                setError(`Authentication failed: ${errorParam}`);
                return;
            }

            if (!code) {
                setError("No authorization code received");
                return;
            }

            try {
                // Get PKCE code verifier from session storage
                const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
                
                // Exchange code for token with backend
                const response = await fetch(`${apiUrl}/api/portal/auth/keycloak-callback`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code,
                        redirectUri: window.location.origin + "/callback",
                        codeVerifier: codeVerifier || undefined,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to exchange authorization code");
                }

                const data = await response.json();

                if (data.success && data.data) {
                    console.log("✅ Callback received data from backend");
                    
                    const {
                        token,
                        refreshToken,
                        email,
                        username,
                        firstName,
                        lastName,
                        groups,
                        userId,
                    } = data.data;

                    console.log("📦 Extracted data - groups:", groups);

                    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username || "";

                    // Store authentication data
                    // Persist token and user info; backend should handle any
                    // tenant/org resolution. Keep groups for client-side UI.
                    localStorage.setItem("token", token);
                    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
                    localStorage.setItem("authMethod", "keycloak");
                    localStorage.setItem("userEmail", email || username || "");
                    localStorage.setItem("userFullName", fullName);
                    localStorage.setItem("userId", String(userId || ""));
                    localStorage.setItem("groups", JSON.stringify(groups || []));
                    localStorage.setItem("user", JSON.stringify(data.data));

                    if (groups && groups.length > 0) {
                        const systemGroups = ["offline_access", "uma_authorization", "default-roles-ciyex", "default-roles-master"];
                        const meaningful = groups.find((g: string) => !systemGroups.includes(g.toLowerCase()));
                        localStorage.setItem("primaryGroup", meaningful || groups[0]);
                    }

                    // Clean up PKCE code verifier
                    sessionStorage.removeItem('pkce_code_verifier');

                    console.log("🔍 Keycloak authentication complete, redirecting to dashboard");
                    
                    // For portal users, redirect directly to dashboard
                    router.replace("/dashboard");
                } else {
                    setError(data.message || "Authentication failed");
                }
            } catch (err) {
                console.error("Callback error:", err);
                setError("An error occurred during authentication");
            }
        };

        handleCallback();
    }, [searchParams, router, apiUrl]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/signin")}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Back to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing authentication...</p>
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
