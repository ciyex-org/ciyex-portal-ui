"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import Alert from "@/components/ui/alert/Alert";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useRouter } from "next/navigation";

/** 🔹 Safe JSON parse */
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/** 🔹 Format date for display */
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/** 🔹 Format time for display */
function formatTime(timeString: string): string {
  try {
    // If it's already a formatted time, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    // If it's a time string like "14:30:00", format it
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
}

type Appointment = {
  id?: number;
  visitType: string;
  patientId?: number;
  providerId: number;
  appointmentStartDate: string;
  appointmentEndDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  formattedDate?: string;
  formattedTime?: string;
  priority: string;
  locationId: number;
  status?: string;
  reason: string;
  orgId?: number;
  providerName?: string;
  locationName?: string;
  patientName?: string;
};

type Provider = {
  id: number;
  identification: { firstName: string; lastName: string };
  professionalDetails?: { specialty?: string };
};

type Location = { id: number; name: string; address: string };

export default function AppointmentsPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Appointment[]>([]);
  const [visitTypes, setVisitTypes] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [visitTypesLoaded, setVisitTypesLoaded] = useState(false);
  const [prioritiesLoaded, setPrioritiesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [telehealthModal, setTelehealthModal] = useState<{ open: boolean; url: string }>({ open: false, url: '' });

  const [form, setForm] = useState({
    providerId: "",
    locationId: "",
    date: "",
    time: "",
    reason: "",
    visitType: "",
    priority: "",
  });

  const [alert, setAlert] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const user = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    
    if (!token || !user) {
      console.log('🔐 No authentication found, redirecting to login...');
      router.replace("/signin");
      return;
    }
    
    try {
      const parsedUser = JSON.parse(user);
      if (!parsedUser || !parsedUser.token) {
        console.log('🔐 Invalid user data, redirecting to login...');
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/signin");
        return;
      }
    } catch (e) {
      console.log('🔐 Failed to parse user data, redirecting to login...');
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/signin");
      return;
    }
  }, [router]);

  /** 🔹 Load initial data */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [apptRes, provRes, locRes] = await Promise.all([
          fetchWithAuth("/api/portal/appointments"),
          fetchWithAuth("/api/portal/providers"),
          fetchWithAuth("/api/portal/locations"),
        ]);

        const appts = await safeJson(apptRes);
        const provs = await safeJson(provRes);
        const locs = await safeJson(locRes);

        setAppointments(appts.data || []);
        setProviders(provs.data || []);
        setLocations(locs.data || []);
        
        // Fetch visit types and priorities using unified portal proxy endpoint
        try {
          console.log('� Fetching visit types and priorities from unified endpoint...');
          
          const listOptionsResponse = await fetchWithAuth('/api/portal/list-options');
          const listOptionsData = await safeJson(listOptionsResponse);
          
          // Extract visit types and priorities from unified response
          const visitTypesList = Array.isArray(listOptionsData?.data?.visit_types) 
            ? listOptionsData.data.visit_types.map((item: Record<string, unknown>) => String(item.title || item.value || item)).filter(Boolean)
            : [];
            
          const prioritiesList = Array.isArray(listOptionsData?.data?.appointment_priorities)
            ? listOptionsData.data.appointment_priorities.map((item: Record<string, unknown>) => String(item.title || item.value || item)).filter(Boolean)
            : [];
          
          console.log('✅ Visit types loaded:', visitTypesList);
          console.log('✅ Priorities loaded:', prioritiesList);
          
          setVisitTypes(visitTypesList);
          setPriorities(prioritiesList);
          setVisitTypesLoaded(true);
          setPrioritiesLoaded(true);
          
          // Update form defaults to match available options
          if (visitTypesList.length > 0 && prioritiesList.length > 0) {
            setForm(prev => ({
              ...prev,
              visitType: visitTypesList.includes(prev.visitType) ? prev.visitType : visitTypesList[0],
              priority: prioritiesList.includes(prev.priority) ? prev.priority : prioritiesList[0]
            }));
          }
        } catch (err) {
          console.error('❌ Error loading unified list options:', err);
          // Set empty arrays and mark as loaded so UI shows 'No available ...'
          setVisitTypes([]);
          setPriorities([]);
          setVisitTypesLoaded(true);
          setPrioritiesLoaded(true);
        }
      } catch (err) {
        console.error("❌ Load error:", err);
        setAlert({
          variant: "error",
          title: "Error",
          message: "Could not load appointments, providers, or locations.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update form defaults when visit types and priorities are loaded
  useEffect(() => {
    if (visitTypesLoaded && prioritiesLoaded && visitTypes.length > 0 && priorities.length > 0) {
      setForm(prev => ({
        ...prev,
        visitType: prev.visitType || visitTypes[0],
        priority: prev.priority || priorities[0]
      }));
    }
  }, [visitTypesLoaded, prioritiesLoaded, visitTypes, priorities]);

  // Check telehealth rooms
  useEffect(() => {
    // Telehealth room checking removed - join button goes directly to video call screen
  }, []);

  /** 🔹 Fetch slots */
  async function fetchSlots(providerId: string, date: string) {
    setFetchingSlots(true);
    try {
      // Convert YYYY-MM-DD to MM/dd/yy format for backend
      const dateObj = new Date(date);
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const year = String(dateObj.getFullYear()).slice(-2);
      const formattedDate = `${month}/${day}/${year}`;
      
      const res = await fetchWithAuth(
        `/api/portal/appointments/available-slots?provider_id=${providerId}&date=${formattedDate}&limit=3`
      );
      const data = await safeJson(res);
      
      // Transform backend slots to expected format
      const slots = (data.data || []).map((slot: { start: string; end: string }) => {
        const startTime = new Date(slot.start);
        const hours = startTime.getHours();
        const minutes = String(startTime.getMinutes()).padStart(2, '0');
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        return {
          appointmentStartTime: `${String(hours).padStart(2, '0')}:${minutes}:00`,
          appointmentStartDate: date,
          appointmentEndDate: date,
          formattedTime: `${hour12}:${minutes} ${ampm}`
        };
      });
      
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setAvailableSlots([]);
    } finally {
      setFetchingSlots(false);
    }
  }

  /** 🔹 Handle form change */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    setForm(newForm);

    // use the updated newForm values (avoid stale state race)
    if (name === "date" && value && newForm.providerId) {
      fetchSlots(newForm.providerId, value);
    }
    if (name === "providerId" && value && newForm.date) {
      fetchSlots(value, newForm.date);
    }
  }

  /** 🔹 Submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.providerId || !form.locationId || !form.date || !form.time) {
      setAlert({
        variant: "error",
        title: "Missing Fields",
        message: "Please select provider, date, time, and location.",
      });
      return;
    }

    // Convert YYYY-MM-DD to MM/dd/yy format for backend
    const dateObj = new Date(form.date);
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const formattedDate = `${month}/${day}/${year}`;

    const newAppt = {
      visitType: form.visitType,
      providerId: Number(form.providerId),
      locationId: Number(form.locationId),
      date: formattedDate, // Send in MM/dd/yy format
      time: form.time, // Send raw time string (HH:mm:ss format)
      reason: form.reason,
      priority: form.priority,
    };

    setSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/portal/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAppt),
      });
      const saved = await safeJson(res);

      if (!saved.success) throw new Error(saved.message);

      setAppointments((prev) => [...prev, saved.data]);
      setShowModal(false);
      setAvailableSlots([]); // Clear slots
      setForm({
        providerId: "",
        locationId: "",
        date: "",
        time: "",
        reason: "",
        visitType: visitTypes.length > 0 ? visitTypes[0] : "",
        priority: priorities.length > 0 ? priorities[0] : "",
      });
      setAlert({
        variant: "success",
        title: "Appointment Requested",
        message: saved.message || "Your appointment request has been sent.",
      });
    } catch (err) {
      setAlert({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Could not create appointment.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /** 🔹 Status badge styling */
  function statusBadge(status?: string) {
    switch ((status || "").toUpperCase()) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Appointments
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              View and manage your healthcare appointments
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Request Appointment
          </button>
        </div>

        {alert && <Alert {...alert} />}

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4 text-lg">Loading your appointments...</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Please wait while we fetch your data</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg bg-white dark:bg-gray-800 shadow-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Visit Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8h6m-7-8h8m-8 0V7a2 2 0 012-2h4a2 2 0 012 2v8a2 2 0 01-2 2H9a2 2 0 01-2-2V7z"/>
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No appointments yet</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Get started by requesting your first appointment</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  appointments.map((a, index) => {
                    const provider = providers.find((p) => p.id === a.providerId);
                    const location = locations.find((l) => l.id === a.locationId);
                    // Compute a clean display name (strip any leading 'Dr.' from backend) and initials
                    const providerRawName = a.providerName
                      ? a.providerName.replace(/^Dr\.?\s+/i, "")
                      : provider
                      ? `${provider.identification.firstName} ${provider.identification.lastName}`
                      : undefined;
                    const providerInitials = providerRawName
                      ? providerRawName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
                      : provider
                      ? `${provider.identification.firstName[0]}${provider.identification.lastName[0]}`.toUpperCase()
                      : '??';
                    const providerDisplayName = providerRawName || (a.providerId ? `Provider #${a.providerId}` : undefined);

                    const isVirtualAppointment = a.visitType?.toLowerCase().includes('virtual') || 
                                                 a.visitType?.toLowerCase().includes('telehealth') ||
                                                 a.visitType?.toLowerCase().includes('video');

                    return (
                      <tr
                        key={a.id || index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {a.formattedDate || formatDate(a.appointmentStartDate)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {a.formattedTime || formatTime(a.appointmentStartTime)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {providerInitials}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {providerDisplayName}
                              </div>
                              {provider?.professionalDetails?.specialty && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {provider.professionalDetails.specialty}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {isVirtualAppointment ? (
                              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                              </svg>
                            )}
                            <span className={`text-sm font-medium ${isVirtualAppointment ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              {a.visitType}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {a.locationName || (location ? location.name : `Location #${a.locationId}`)}
                          </div>
                          {location?.address && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {location.address}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(
                              a.status
                            )}`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {isVirtualAppointment && a.status?.toLowerCase() === 'scheduled' && a.id && (
                              <button
                                onClick={() => {
                                  setTelehealthModal({ open: true, url: `/telehealth/${a.id}` });
                                  window.open(`/telehealth/${a.id}`, '_blank', 'noopener,noreferrer');
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-200"
                                title="Join Video Call"
                                aria-label={`Join video call for appointment ${a.id}`}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                </svg>
                                Join
                              </button>
                            )}
                            <button
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm flex items-center justify-center p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              onClick={() => setSelectedAppointment(a)}
                              aria-label={`View details for appointment ${a.id ?? index}`}
                              title="View Details"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                {/* Eye icon path */}
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Details Modal */}
        {selectedAppointment && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedAppointment(null); }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appointment Details</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">View details for your appointment</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelectedAppointment(null)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="font-medium">{selectedAppointment.formattedDate || formatDate(selectedAppointment.appointmentStartDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Time</div>
                  <div className="font-medium">{selectedAppointment.formattedTime || formatTime(selectedAppointment.appointmentStartTime)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Provider</div>
                  <div className="font-medium">{selectedAppointment.providerName || providers.find(p => p.id === selectedAppointment.providerId)?.identification.firstName + ' ' + providers.find(p => p.id === selectedAppointment.providerId)?.identification.lastName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="font-medium">{selectedAppointment.locationName || locations.find(l => l.id === selectedAppointment.locationId)?.name}</div>
                  <div className="text-xs text-gray-500">{locations.find(l => l.id === selectedAppointment.locationId)?.address}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Reason</div>
                  <div className="font-medium">{selectedAppointment.reason || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium">{selectedAppointment.status}</div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button className="px-3 py-1.5 text-xs font-medium rounded-md border" onClick={() => setSelectedAppointment(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request Appointment</h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Schedule your healthcare visit</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Provider */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Healthcare Provider *
                  </label>
                  <select
                    name="providerId"
                    value={form.providerId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose provider</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        Dr. {p.identification.firstName} {p.identification.lastName}
                        {p.professionalDetails?.specialty
                          ? ` - ${p.professionalDetails.specialty}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                {form.providerId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Date *
                    </label>
                    <select
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                      required
                    >
                      <option value="">Select a date</option>
                      {(() => {
                        const dates = [];
                        const today = new Date();
                        for (let i = 0; i < 30; i++) {
                          const date = new Date(today);
                          date.setDate(today.getDate() + i);
                          const dateString = date.toISOString().split('T')[0];
                          const displayText = i === 0 ? 'Today' :
                                            i === 1 ? 'Tomorrow' :
                                            date.toLocaleDateString('en-US', {
                                              weekday: 'short',
                                              month: 'short',
                                              day: 'numeric'
                                            });
                          dates.push(
                            <option key={dateString} value={dateString}>
                              {displayText}
                            </option>
                          );
                        }
                        return dates;
                      })()}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Choose from the next 30 days
                    </p>
                  </div>
                )}

                {/* Slots */}
                {form.providerId && form.date && fetchingSlots && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Loading available slots...</span>
                  </div>
                )}

                {form.providerId && form.date && !fetchingSlots && availableSlots.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Available Time Slots *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {availableSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, time: slot.appointmentStartTime }))
                          }
                          className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 ${
                            form.time === slot.appointmentStartTime
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          }`}
                        >
                          {slot.formattedTime || slot.appointmentStartTime}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {form.providerId && form.date && !fetchingSlots && availableSlots.length === 0 && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                      </svg>
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        No available slots for this date. Try another date.
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location *
                  </label>
                  <select
                    name="locationId"
                    value={form.locationId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.address && `- ${l.address}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div>

<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Visit
                  </label>
                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Describe symptoms or reason..."
                  />
                </div>

                {/* Visit Type & Priority */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Visit Type</label>
                    <select
                      name="visitType"
                      value={form.visitType}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select visit type</option>
                      {visitTypes.map((vt, index) => (
                        <option key={index} value={vt}>{vt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select priority</option>
                      {priorities.map((p, index) => (
                        <option key={index} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Virtual Visit Info */}
                {(form.visitType.toLowerCase().includes('virtual') || 
                  form.visitType.toLowerCase().includes('telehealth') ||
                  form.visitType.toLowerCase().includes('video')) && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                      <div>
                        <h4 className="text-xs font-medium text-green-800 dark:text-green-200">
                          Virtual Appointment
                        </h4>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                          You&apos;ll receive a video call link once confirmed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!form.time || !form.providerId || !form.locationId || submitting}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center ${
                      form.time && form.providerId && form.locationId && !submitting
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : form.time && form.providerId && form.locationId ? (
                      <>
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8h6m-7-8h8m-8 0V7a2 2 0 012-2h4a2 2 0 012 2v8a2 2 0 01-2-2V7z"/>
                        </svg>
                        Request
                      </>
                    ) : (
                      'Complete Form'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Telehealth Modal */}
      {telehealthModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video Call</h3>
              <button
                onClick={() => setTelehealthModal({ open: false, url: '' })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-4">
              <iframe
                src={telehealthModal.url}
                className="w-full h-full border-0 rounded"
                title="Telehealth Video Call"
                allow="camera; microphone; fullscreen"
              />
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
