"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /medical-records — redirects to /documents
 * Medical records are accessed through the Documents page.
 */
export default function MedicalRecordsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/documents");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-500 text-sm">Redirecting to Documents...</p>
        </div>
    );
}
