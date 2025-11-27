"use client";

import { useEffect, useState, useCallback } from "react";

import AdminLayout from "@/app/(admin)/layout";
import Alert from "@/components/ui/alert/Alert";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type Topic = {
  id: string;
  title: string;
  summary: string;
  category: string;
  language: string;
  readingLevel: string;
  content: string;
  fhirId?: string;
};

type Assignment = {
  id: string;
  patientId: string;
  patientName: string;
  notes: string;
  delivered: boolean;
  assignedDate: string;
  topic: {
    id: string;
    title: string;
    summary: string;
    category: string;
    language: string;
    readingLevel: string;
    content: string;
    fhirId?: string;
  };
};

export default function PatientEducationPage() {
  const [mounted, setMounted] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'assigned'>('assigned');

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education?page=0&size=100`
      );
      const response = await res.json();
      // Backend returns ApiResponse<Page<PatientEducationDto>>
      if (response.success && response.data) {
        setTopics(response.data.content || []);
      }
    } catch {
      showAlert("error", "Failed to load topics");
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    if (!mounted) return;
    
    try {
      // Get the current user's patient ID from JWT or session
      const patientId = localStorage.getItem('ehrPatientId') || '21'; // Emma's patient ID
      
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/patient-education-assignments/patient/${patientId}`
      );
      const response = await res.json();
      // Backend returns ApiResponse<List<PatientEducationAssignmentDto>>
      if (response.success && response.data) {
        setAssignments(response.data || []);
      }
    } catch {
      showAlert("error", "Failed to load assignments");
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      loadTopics();
      loadAssignments();
    }
  }, [mounted, loadTopics, loadAssignments]);

  // These functions are for admin/provider use - patient portal is read-only
  // const assignTopic = async (topicId: string) => { ... }
  // const saveTopic = async () => { ... }
  // const deleteTopic = async (id: string) => { ... }

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  if (!mounted) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  const assignedTopicIds = new Set(assignments.map(a => a.topic?.id || a.patientId));
  const displayTopics = viewMode === 'assigned' 
    ? assignments.map(a => a.topic).filter(Boolean) 
    : topics;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Patient Education</h1>
                <p className="text-white/90 mt-1">Learn about your health and wellness</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="text-sm text-white/80">Assigned Topics</div>
                <div className="text-2xl font-bold">{assignments.length}</div>
              </div>
            </div>
          </div>
        </div>

        {alert && (
          <div className="animate-fadeIn">
            <Alert message={alert.message} variant={alert.type === "success" ? "success" : "error"} title={alert.type === "success" ? "Success" : "Error"} />
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
            <button
              onClick={() => setViewMode('assigned')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'assigned'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              📚 My Assigned Topics ({assignments.length})
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              🌐 All Topics ({topics.length})
            </button>
          </div>
        </div>

        {/* Topics Grid */}
        {displayTopics.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {viewMode === 'assigned' ? 'No Topics Assigned Yet' : 'No Topics Available'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {viewMode === 'assigned' 
                ? 'Your healthcare provider will assign educational materials as needed.'
                : 'Check back later for educational content.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTopics.map((topic) => {
              const isAssigned = assignedTopicIds.has(topic.id);
              const assignment = assignments.find(a => a.topic?.id === topic.id);
              
              return (
                <div
                  key={topic.id}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600"
                >
                  {/* Category Badge */}
                  <div className="relative h-2 bg-gradient-to-r from-blue-500 to-purple-500">
                    {isAssigned && (
                      <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-lg flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Assigned</span>
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Category and Reading Level */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {topic.category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{topic.readingLevel}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {topic.title}
                    </h2>

                    {/* Summary */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {topic.summary}
                    </p>

                    {/* Assignment Info */}
                    {assignment && (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-green-800 dark:text-green-300">Assigned by your provider</p>
                            {assignment.notes && (
                              <p className="text-xs text-green-700 dark:text-green-400 mt-1">{assignment.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Language */}
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      <span>{topic.language}</span>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => setSelected(topic)}
                      className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>Read Content</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl h-full overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {selected.category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selected.readingLevel} • {selected.language}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selected.title}</h2>
                  {selected.summary && (
                    <p className="text-gray-600 dark:text-gray-400">{selected.summary}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div 
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:text-gray-700 dark:prose-ul:text-gray-300"
                dangerouslySetInnerHTML={{ __html: selected.content }} 
              />
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {assignedTopicIds.has(selected.id) && (
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">This topic has been assigned to you by your healthcare provider</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
