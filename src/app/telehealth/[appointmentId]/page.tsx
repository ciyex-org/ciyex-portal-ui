"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/**
 * Patient telehealth entry: /telehealth/{appointmentId}
 * Finds the session for this appointment via ciyex-api (SDK-routed),
 * then redirects to the generic session page ?role=patient.
 * No vendor-specific code here.
 */
export default function PatientTelehealthPage() {
    const params = useParams();
    const router = useRouter();
    const appointmentId = params?.appointmentId as string;

    const [error, setError] = useState<string | null>(null);

    const joinSession = async () => {
        try {
            setError(null);

            // Look up existing session for this appointment, or create one
            const res = await fetchWithAuth(`/api/telehealth/sessions/from-appointment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointmentId }),
            });

            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error("Your provider has not started the video call yet. Please wait and try again.");
                }
                const text = await res.text();
                // Parse backend error message for user-friendly display
                let msg = "Failed to join session";
                try {
                    const errJson = JSON.parse(text);
                    msg = errJson.message || msg;
                } catch { msg = text || msg; }
                if (msg.includes("Telehealth service call failed") || msg.includes("404")) {
                    throw new Error("The telehealth service is currently unavailable. Please contact your provider or try again later.");
                }
                throw new Error(msg);
            }

            const json = await res.json();
            const session = json.data || json;
            if (!session?.id) throw new Error("No session found for this appointment");

            router.replace(`/telehealth/session/${session.id}?role=patient`);
        } catch (err: any) {
            console.error("[portal/telehealth] join error:", err);
            setError(err.message || "Failed to join video call");
        }
    };

    useEffect(() => {
        if (appointmentId) joinSession();
    }, [appointmentId]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Join Video Call</h1>
                <p className="text-gray-500 text-center max-w-md mb-6">{error}</p>
                <div className="flex gap-3">
                    <button onClick={joinSession} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Try Again
                    </button>
                    <button onClick={() => router.push("/appointments")} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300">
                        Return to Appointments
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-700 dark:text-gray-300">Joining your telehealth session...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we connect you</p>
        </div>
    );
}
