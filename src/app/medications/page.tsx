"use client";

import AdminLayout from "@/app/(admin)/layout";
import { useMedications } from "@/hooks/useMedications";

export default function MedicationsPage() {
  const { medications, loading, error } = useMedications();

  if (loading) return (
    <AdminLayout>
      <div className="p-6 text-gray-600">Loading medications...</div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-yellow-600 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Unable to Load Medications</h3>
              <p className="text-yellow-700 mb-3">
                We could not retrieve your medications data at this time. This might be because your patient record has not been linked to the EHR system yet, or you do not have permission to view this data.
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

  return (
    <AdminLayout>
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Medications</h1>
            <p className="text-slate-600 mt-1">
              View your current and past medication prescriptions
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {medications.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No medications found</h3>
            <p className="text-gray-600">Your medication prescriptions will appear here once they are prescribed by your healthcare provider.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Medication History
              </h2>
              <p className="text-blue-100 text-sm mt-1">Track your medication prescriptions over time</p>
            </div>

            <div className="">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded mr-2">
                          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        Medication
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Dosage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Instructions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Prescribed Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Prescribing Doctor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {medications.map((medication, i) => (
                    <tr key={medication.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {medication.medicationName}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {medication.dosage || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={medication.instructions || ''}>
                          {medication.instructions || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {(() => {
                            try {
                              const date = new Date(medication.dateIssued);
                              return isNaN(date.getTime()) 
                                ? medication.dateIssued || '-' 
                                : date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  });
                            } catch {
                              return medication.dateIssued || '-';
                            }
                          })()}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {medication.prescribingDoctor || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          medication.status?.toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : medication.status?.toLowerCase() === 'discontinued'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : medication.status?.toLowerCase() === 'completed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {medication.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span>Active</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>Discontinued</span>
                  </div>
                </div>
                <div className="text-xs">
                  Showing {medications.length} medication{medications.length !== 1 ? 's' : ''} prescription{medications.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
