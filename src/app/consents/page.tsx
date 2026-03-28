"use client";

import AdminLayout from "@/app/(admin)/layout";
import { FileCheck, Clock } from "lucide-react";

export default function ConsentsPage() {
    return (
        <AdminLayout>
            <div className="p-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <FileCheck className="w-6 h-6 text-brand-500" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consents &amp; Authorizations</h1>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Coming Soon</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Consent management will be available here. You&apos;ll be able to view and manage
                        your healthcare consent forms and authorizations.
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-4">
                        Contact your provider&apos;s office for consent-related requests.
                    </p>
                </div>
            </div>
        </AdminLayout>
    );
}
