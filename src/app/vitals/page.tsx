"use client";

import AdminLayout from "@/app/(admin)/layout";
import { useVitals } from "@/hooks/useVitals";

export default function VitalsPage() {
  const { vitals, loading, error } = useVitals();

  if (loading) return (
    <AdminLayout>
      <div className="p-6 text-gray-600">Loading vitals...</div>
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
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Unable to Load Vitals</h3>
              <p className="text-yellow-700 mb-3">
                We could not retrieve your vitals data at this time. This might be because your patient record has not been linked to the EHR system yet, or you do not have permission to view this data.
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
            <h1 className="text-2xl font-bold text-slate-900">My Health Vitals</h1>
            <p className="text-slate-600 mt-1">
              View your vital signs and health measurements
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {vitals.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vitals recorded yet</h3>
            <p className="text-gray-600">Your health vitals will appear here once they are recorded by your healthcare provider.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Vital Signs History
              </h2>
              <p className="text-blue-100 text-sm mt-1">Track your health measurements over time</p>
            </div>

            <div className="">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <div className="p-1 bg-red-100 dark:bg-red-800 rounded mr-2">
                          <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        Blood Pressure
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <div className="p-1 bg-green-100 dark:bg-green-800 rounded mr-2">
                          <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        Heart Rate
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <div className="p-1 bg-orange-100 dark:bg-orange-800 rounded mr-2">
                          <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        Temperature
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded mr-2">
                          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        O₂ Saturation
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <div className="p-1 bg-purple-100 dark:bg-purple-800 rounded mr-2">
                          <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M12 7l3 9m0 0l6-2m-6 2l-3-1" />
                          </svg>
                        </div>
                        Weight & BMI
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {vitals.map((vital, i) => (
                    <tr key={vital.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {vital.bpSystolic && vital.bpDiastolic ? (
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              vital.bpSystolic >= 140 || vital.bpDiastolic >= 90
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : vital.bpSystolic >= 120 || vital.bpDiastolic >= 80
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {vital.bpSystolic}/{vital.bpDiastolic}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {vital.pulse ? (
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              vital.pulse >= 100
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : vital.pulse >= 60
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {vital.pulse}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {(vital.temperatureF || vital.temperatureC) ? (
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              {vital.temperatureF || vital.temperatureC}°{vital.temperatureF ? 'F' : 'C'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {vital.oxygenSaturation ? (
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              vital.oxygenSaturation >= 95
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : vital.oxygenSaturation >= 90
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {vital.oxygenSaturation}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {(vital.weightKg || vital.weightLbs) ? (
                          <div className="text-xs">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {vital.weightKg ? `${vital.weightKg}kg` : `${vital.weightLbs}lbs`}
                            </div>
                            {vital.bmi && (
                              <div className="text-gray-500 dark:text-gray-400">
                                BMI: {vital.bmi}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-900 dark:text-white max-w-xs truncate" title="Routine vitals check">
                          Routine vitals check
                        </div>
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
                    <span>Normal</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span>Elevated</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>High</span>
                  </div>
                </div>
                <div className="text-xs">
                  Showing {vitals.length} vital{vitals.length !== 1 ? 's' : ''} record{vitals.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
