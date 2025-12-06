'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import { useMedications } from '@/hooks/useMedications';
import AdminLayout from "@/app/(admin)/layout";
import { useRouter } from "next/navigation";

// Types
interface PatientInfo {
    id: number;
    portalUserId: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    dateOfBirth: string;
    gender?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    ehrPatientId?: number;
    medicalRecordNumber?: string;
    status: string;
}

interface Appointment {
    id: number;
    appointmentDate: string;
    appointmentTime: string;
    providerName: string;
    appointmentType: string;
    status: string;
}

interface Vital {
    id: string | number;
    vitalType: string;
    value: string;
    unit: string;
    recordedDate: string;
}


interface Activity {
    id: number;
    type: 'appointment' | 'message' | 'lab' | 'medication' | 'education';
    title: string;
    description: string;
    timestamp: string;
    status?: string;
}

interface ApiVitalsResponse {
    id: number;
    patientId: number;
    encounterId: number;
    weightKg?: number;
    weightLbs?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    pulse?: number;
    respiration?: number;
    temperatureC?: number;
    temperatureF?: number;
    oxygenSaturation?: number;
    bmi?: number;
    notes?: string;
    recordedAt?: string;
    createdDate?: string;
}

interface ApiAppointmentResponse {
    id: number;
    appointmentStartDate?: string;
    appointmentDate?: string;
    appointmentStartTime?: string;
    appointmentTime?: string;
    providerName?: string;
    visitType?: string;
    appointmentType?: string;
    status?: string;
}

interface ApiCommunicationResponse {
    id: number;
    subject?: string;
    messageBody?: string;
    body?: string;
    createdAt?: string;
    sentAt?: string;
    read?: boolean;
}

// Enhanced Patient Dashboard Component
function PatientDashboard() {
    const router = useRouter();
    const [patient, setPatient] = useState<PatientInfo | null>(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [recentVitals, setRecentVitals] = useState<Vital[]>([]);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [currentBMI, setCurrentBMI] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Use the medications hook
    const { medications: currentMedications } = useMedications();

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');

            if (!token || !user) {
                router.push('/signin');
                return;
            }

            try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

                // Get basic user info from localStorage instead of API call
                const userData = JSON.parse(user);
                if (userData) {
                    // Set minimal patient data from localStorage
                    setPatient({
                        id: 0,
                        portalUserId: 0,
                        firstName: userData.firstName || userData.name?.split(' ')[0] || 'Patient',
                        lastName: userData.lastName || userData.name?.split(' ')[1] || '',
                        email: userData.email || '',
                        phoneNumber: userData.phoneNumber || '',
                        dateOfBirth: userData.dateOfBirth || new Date().toISOString().split('T')[0],
                        gender: userData.gender || '',
                        status: 'active'
                    });
                }

                // Fetch upcoming appointments
                try {
                    // For now, use the general appointments endpoint and filter for upcoming
                    const appointmentsResponse = await fetchWithAuth(`${apiBase}/api/portal/appointments`);
                    const appointmentsData = await appointmentsResponse.json();
                    if (appointmentsData.success && appointmentsData.data) {
                        // Filter for upcoming appointments (next 30 days)
                        const now = new Date();
                        const thirtyDaysFromNow = new Date();
                        thirtyDaysFromNow.setDate(now.getDate() + 30);
                        
                        const upcoming = appointmentsData.data
                            .filter((apt: ApiAppointmentResponse) => {
                                const aptDate = new Date(apt.appointmentStartDate || apt.appointmentDate || '');
                                return aptDate >= now && aptDate <= thirtyDaysFromNow;
                            })
                            .slice(0, 5) // Limit to 5 upcoming appointments
                            .map((apt: ApiAppointmentResponse) => ({
                                id: apt.id,
                                appointmentDate: apt.appointmentStartDate || apt.appointmentDate || '',
                                appointmentTime: apt.appointmentStartTime || apt.appointmentTime || '09:00:00',
                                providerName: apt.providerName || 'Provider',
                                appointmentType: apt.visitType || apt.appointmentType || 'Appointment',
                                status: apt.status || 'scheduled'
                            }));
                        
                        setUpcomingAppointments(upcoming);
                    }
                } catch (err) {
                    console.log('Could not fetch appointments:', err);
                    // Use mock data for demonstration
                    setUpcomingAppointments([
                        {
                            id: 1,
                            appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            appointmentTime: '10:00:00',
                            providerName: 'Dr. Sarah Johnson',
                            appointmentType: 'Annual Physical',
                            status: 'confirmed'
                        },
                        {
                            id: 2,
                            appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            appointmentTime: '14:30:00',
                            providerName: 'Dr. Michael Chen',
                            appointmentType: 'Follow-up Visit',
                            status: 'confirmed'
                        }
                    ]);
                }

                // Fetch recent vitals
                let vitalsData: { success: boolean; data?: ApiVitalsResponse[] } | null = null;
                try {
                    const vitalsResponse = await fetchWithAuth(`${apiBase}/api/fhir/vitals/my`);
                    if (!vitalsResponse.ok) {
                        console.log('Vitals fetch failed:', vitalsResponse.status);
                        setRecentVitals([]);
                    } else {
                        vitalsData = await vitalsResponse.json().catch(() => null);
                        if (vitalsData && vitalsData.success && vitalsData.data) {
                            // Transform backend vitals to frontend format
                            const transformedVitals = vitalsData.data.map((vital: ApiVitalsResponse) => {
                                const vitalsList = [];
                                if (vital.bpSystolic && vital.bpDiastolic) {
                                    vitalsList.push({
                                        id: `bp-${vital.id}`,
                                        vitalType: 'Blood Pressure',
                                        value: `${vital.bpSystolic}/${vital.bpDiastolic}`,
                                        unit: 'mmHg',
                                        recordedDate: vital.recordedAt || vital.createdDate || new Date().toISOString()
                                    });
                                }
                                if (vital.pulse) {
                                    vitalsList.push({
                                        id: `pulse-${vital.id}`,
                                        vitalType: 'Heart Rate',
                                        value: vital.pulse.toString(),
                                        unit: 'bpm',
                                        recordedDate: vital.recordedAt || vital.createdDate || new Date().toISOString()
                                    });
                                }
                                if (vital.temperatureF || vital.temperatureC) {
                                    vitalsList.push({
                                        id: `temp-${vital.id}`,
                                        vitalType: 'Temperature',
                                        value: (vital.temperatureF || vital.temperatureC || 0).toString(),
                                        unit: vital.temperatureF ? '°F' : '°C',
                                        recordedDate: vital.recordedAt || vital.createdDate || new Date().toISOString()
                                    });
                                }
                                if (vital.weightLbs || vital.weightKg) {
                                    vitalsList.push({
                                        id: `weight-${vital.id}`,
                                        vitalType: 'Weight',
                                        value: (vital.weightLbs || vital.weightKg || 0).toString(),
                                        unit: vital.weightLbs ? 'lbs' : 'kg',
                                        recordedDate: vital.recordedAt || vital.createdDate || new Date().toISOString()
                                    });
                                }
                                if (vital.oxygenSaturation) {
                                    vitalsList.push({
                                        id: `oxygen-${vital.id}`,
                                        vitalType: 'Oxygen Saturation',
                                        value: vital.oxygenSaturation.toString(),
                                        unit: '%',
                                        recordedDate: vital.recordedAt || vital.createdDate || new Date().toISOString()
                                    });
                                }
                                return vitalsList;
                            }).flat().slice(0, 10); // Limit to 10 recent vitals

                            setRecentVitals(transformedVitals);
                        } else {
                            console.log('No vitals data available');
                            setRecentVitals([]);
                        }
                    }
                } catch (err) {
                    console.log('Could not fetch vitals:', err);
                    setRecentVitals([]);
                }

                // Calculate BMI from most recent vitals data
                if (vitalsData && vitalsData.success && vitalsData.data) {
                    const latestVitalWithBMI = vitalsData.data
                        .filter((vital: ApiVitalsResponse) => vital.bmi !== null && vital.bmi !== undefined)
                        .sort((a: ApiVitalsResponse, b: ApiVitalsResponse) => {
                            const dateA = new Date(a.recordedAt || a.createdDate || '').getTime();
                            const dateB = new Date(b.recordedAt || b.createdDate || '').getTime();
                            return dateB - dateA; // Most recent first
                        })[0];

                    if (latestVitalWithBMI) {
                        setCurrentBMI(latestVitalWithBMI.bmi ?? null);
                    }
                }

                // Fetch current medications (using the hook now)
                // Medications are handled by the useMedications hook

                // Fetch recent activities from communications
                try {
                    const communicationsResponse = await fetchWithAuth(`${apiBase}/api/portal/communications/my`);
                    if (communicationsResponse.ok) {
                        const communicationsData = await communicationsResponse.json();
                        if (communicationsData.success && communicationsData.data) {
                            // Transform communications to activities
                            const activities: Activity[] = communicationsData.data.slice(0, 6).map((comm: ApiCommunicationResponse) => ({
                                id: comm.id,
                                type: 'message' as const,
                                title: comm.subject || 'Message',
                                description: comm.messageBody || comm.body || 'New message received',
                                timestamp: comm.createdAt || comm.sentAt || new Date().toISOString(),
                                status: comm.read ? 'read' : 'unread'
                            }));
                            setRecentActivities(activities);
                        }
                    }
                } catch (err) {
                    console.log('Could not fetch communications:', err);
                    // Keep empty activities array
                    setRecentActivities([]);
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setError('Failed to load dashboard information');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('orgId');
        localStorage.removeItem('orgs');
        localStorage.removeItem('orgName');
        localStorage.removeItem('role');
        router.push('/signin');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeString: string) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your health dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="text-red-500 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={handleLogout}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AdminLayout>
            {/* Enhanced Hero Section - More Compact */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>
                </div>

                <div className="relative px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <div className="mb-6">
                            <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                                Welcome back, {patient?.firstName || 'Patient'}!
                            </h1>
                            <p className="text-blue-100 text-base max-w-2xl mx-auto">
                                Your health dashboard is ready. Stay informed and take control of your wellness journey.
                            </p>
                        </div>

                        {/* Stats Cards - More Compact */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                <div className="text-xl font-bold text-white mb-1">{upcomingAppointments.length}</div>
                                <div className="text-blue-100 text-sm">Upcoming Appointments</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                <div className="text-xl font-bold text-white mb-1">{currentMedications.length}</div>
                                <div className="text-blue-100 text-sm">Active Medications</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                <div className="text-xl font-bold text-white mb-1">{recentActivities.length}</div>
                                <div className="text-blue-100 text-sm">Recent Activities</div>
                            </div>
                        </div>

                        {/* Quick Action Buttons - More Compact */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => router.push('/appointments')}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center border border-white/30 hover:border-white/50 text-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Schedule Appointment
                            </button>
                            <button
                                onClick={() => router.push('/messages')}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center border border-white/30 hover:border-white/50 text-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Contact Provider
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Quick Actions - More Compact */}
            <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Quick Actions</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto text-sm">Access your most frequently used features and manage your health information with ease.</p>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mt-4"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div
                            onClick={() => router.push('/appointments')}
                            className="group bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-blue-200/50 overflow-hidden"
                        >
                            <div className="p-6 text-center relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">Appointments</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">View & book visits with ease</p>
                                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto"></div>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => router.push('/messages')}
                            className="group bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-green-200/50 overflow-hidden"
                        >
                            <div className="p-6 text-center relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">Messages</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Secure communication with your care team</p>
                                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto"></div>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => router.push('/vitals')}
                            className="group bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-purple-200/50 overflow-hidden"
                        >
                            <div className="p-6 text-center relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">Vitals</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Track your health measurements</p>
                                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mx-auto"></div>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => router.push('/medications')}
                            className="group bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-red-200/50 overflow-hidden"
                        >
                            <div className="p-6 text-center relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600"></div>
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-700 transition-colors">Medications</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Manage your prescriptions</p>
                                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full mx-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Metrics */}
            <div className="px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Health Overview</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">Track your key health metrics and stay informed about your well-being.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* BMI Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6">
                            <div className="flex items-center justify-between">
                                <div className="text-white">
                                    <p className="text-sm font-medium opacity-90">BMI</p>
                                    <p className="text-3xl font-bold">{currentBMI ? currentBMI.toFixed(1) : 'N/A'}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600">
                                {currentBMI ? (
                                    currentBMI < 18.5 ? 'Underweight' :
                                    currentBMI < 25 ? 'Normal' :
                                    currentBMI < 30 ? 'Overweight' : 'Obese'
                                ) : 'No data available'}
                            </p>
                        </div>
                    </div>

                    {/* Blood Pressure Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                        <div className="bg-gradient-to-br from-red-500 to-pink-600 p-6">
                            <div className="flex items-center justify-between">
                                <div className="text-white">
                                    <p className="text-sm font-medium opacity-90">Blood Pressure</p>
                                    <p className="text-3xl font-bold">
                                        {recentVitals.find(v => v.vitalType === 'Blood Pressure')?.value || 'N/A'}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600">Last reading: {recentVitals.find(v => v.vitalType === 'Blood Pressure') ? formatDate(recentVitals.find(v => v.vitalType === 'Blood Pressure')!.recordedDate) : 'N/A'}</p>
                        </div>
                    </div>

                    {/* Heart Rate Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6">
                            <div className="flex items-center justify-between">
                                <div className="text-white">
                                    <p className="text-sm font-medium opacity-90">Heart Rate</p>
                                    <p className="text-3xl font-bold">
                                        {recentVitals.find(v => v.vitalType === 'Heart Rate')?.value || 'N/A'}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600">BPM • Last reading: {recentVitals.find(v => v.vitalType === 'Heart Rate') ? formatDate(recentVitals.find(v => v.vitalType === 'Heart Rate')!.recordedDate) : 'N/A'}</p>
                        </div>
                    </div>

                    {/* Weight Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6">
                            <div className="flex items-center justify-between">
                                <div className="text-white">
                                    <p className="text-sm font-medium opacity-90">Weight</p>
                                    <p className="text-3xl font-bold">
                                        {recentVitals.find(v => v.vitalType === 'Weight')?.value || 'N/A'}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0m-6.001-10l6.001 0m6.001 0l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M12 7l3 9m-3-9l-3 9m0 0l3 1m-3-1l-3-1" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600">{recentVitals.find(v => v.vitalType === 'Weight')?.unit || 'lbs'} • Last recorded: {recentVitals.find(v => v.vitalType === 'Weight') ? formatDate(recentVitals.find(v => v.vitalType === 'Weight')!.recordedDate) : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-12">
                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Patient Info, Appointments & Health Summary */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Enhanced Patient Information Card */}
                            {patient && (
                                <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl shadow-xl border border-blue-100/50 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <h2 className="text-lg font-bold text-white">Patient Information</h2>
                                            </div>
                                            <button
                                                onClick={() => router.push('/profile')}
                                                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 flex items-center"
                                            >
                                                Edit Profile
                                                <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Personal Details */}
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-200/30">
                                                <div className="flex items-center mb-3">
                                                    <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-base font-bold text-gray-900">Personal Details</h3>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-blue-100">
                                                        <span className="text-gray-600 text-xs font-medium">Full Name:</span>
                                                        <span className="font-semibold text-gray-900 text-sm">{patient.firstName} {patient.lastName}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-blue-100">
                                                        <span className="text-gray-600 text-xs font-medium">Date of Birth:</span>
                                                        <span className="font-semibold text-gray-900 text-sm">{formatDate(patient.dateOfBirth)}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-blue-100">
                                                        <span className="text-gray-600 text-xs font-medium">Gender:</span>
                                                        <span className="font-semibold text-gray-900 text-sm">{patient.gender || 'Not specified'}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:justify-between py-1">
                                                        <span className="text-gray-600 text-xs font-medium">Medical Record #:</span>
                                                        <span className="font-semibold text-blue-600 text-sm">{patient.medicalRecordNumber || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Info */}
                                            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4 border border-purple-200/30">
                                                <div className="flex items-center mb-3">
                                                    <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center mr-2">
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-base font-bold text-gray-900">Contact Information</h3>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-purple-100">
                                                        <span className="text-gray-600 text-xs font-medium">Email:</span>
                                                        <span className="font-semibold text-blue-600 break-all text-sm">{patient.email}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-purple-100">
                                                        <span className="text-gray-600 text-xs font-medium">Phone:</span>
                                                        <span className="font-semibold text-gray-900 text-sm">{patient.phoneNumber || 'Not provided'}</span>
                                                    </div>
                                                    {patient.addressLine1 && (
                                                        <div className="flex flex-col sm:flex-row sm:justify-between py-1">
                                                            <span className="text-gray-600 text-xs font-medium">Address:</span>
                                                            <span className="font-semibold text-right text-gray-900 text-sm">
                                                                {patient.addressLine1}<br />
                                                                {patient.city && `${patient.city}, `}{patient.state} {patient.postalCode}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Emergency Contact */}
                                                {(patient.emergencyContactName || patient.emergencyContactPhone) && (
                                                    <div className="mt-4 pt-3 border-t border-purple-200">
                                                        <div className="flex items-center mb-2">
                                                            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center mr-1">
                                                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                                </svg>
                                                            </div>
                                                            <h4 className="text-sm font-bold text-red-600">Emergency Contact</h4>
                                                        </div>
                                                        <div className="space-y-1 bg-red-50 rounded p-2">
                                                            {patient.emergencyContactName && (
                                                                <div className="flex flex-col sm:flex-row sm:justify-between">
                                                                    <span className="text-gray-600 text-xs">Name:</span>
                                                                    <span className="font-semibold text-gray-900 text-sm">{patient.emergencyContactName}</span>
                                                                </div>
                                                            )}
                                                            {patient.emergencyContactPhone && (
                                                                <div className="flex flex-col sm:flex-row sm:justify-between">
                                                                    <span className="text-gray-600 text-xs">Phone:</span>
                                                                    <span className="font-semibold text-red-600 text-sm">{patient.emergencyContactPhone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Upcoming Appointments */}
                            <div className="bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 rounded-2xl shadow-xl border border-green-100/50 overflow-hidden">
                                <div className="bg-gradient-to-r from-green-500 to-blue-600 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <h2 className="text-lg font-bold text-white">Upcoming Appointments</h2>
                                        </div>
                                        <button
                                            onClick={() => router.push('/appointments')}
                                            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 flex items-center"
                                        >
                                            View All
                                            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4">
                                    {upcomingAppointments.length > 0 ? (
                                        <div className="space-y-3">
                                            {upcomingAppointments.slice(0, 3).map((appointment) => (
                                                <div key={appointment.id} className="flex items-center p-3 bg-gradient-to-r from-blue-50 via-white to-green-50 rounded-lg border border-blue-100/50 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                                                    <div className="flex-shrink-0 mr-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-base font-bold text-gray-900 mb-1">{appointment.appointmentType}</h3>
                                                        <p className="text-gray-600 mb-1 text-sm">with <span className="font-medium text-blue-600">{appointment.providerName}</span></p>
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {formatDate(appointment.appointmentDate)} at {formatTime(appointment.appointmentTime)}
                                                        </div>
                                                    </div>
                                                    <div className="ml-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                            appointment.status === 'confirmed'
                                                                ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-sm'
                                                                : 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-sm'
                                                        }`}>
                                                            {appointment.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-2">No upcoming appointments</h3>
                                            <p className="text-gray-600 mb-4 max-w-md mx-auto text-sm">Schedule your next visit with your healthcare provider to stay on top of your health.</p>
                                            <button
                                                onClick={() => router.push('/appointments')}
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                            >
                                                Schedule Appointment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Enhanced Health Summary Widgets */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Recent Vitals */}
                                <div className="bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/30 rounded-xl shadow-lg border border-cyan-100/50 overflow-hidden">
                                    <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-2">
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-base font-bold text-white">Recent Vitals</h3>
                                            </div>
                                            <button
                                                onClick={() => router.push('/vitals')}
                                                className="text-cyan-100 hover:text-white text-xs font-medium transition-colors"
                                            >
                                                View All →
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        {recentVitals.length > 0 ? (
                                            <div className="space-y-3">
                                                {recentVitals.slice(0, 3).map((vital) => (
                                                    <div key={vital.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-100/50 hover:shadow-sm transition-all duration-200">
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{vital.vitalType}</p>
                                                            <p className="text-xs text-gray-600">{formatDate(vital.recordedDate)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-blue-600">{vital.value}</p>
                                                            <p className="text-xs text-gray-600 font-medium">{vital.unit}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-600 font-medium text-sm">No recent vitals recorded</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Current Medications */}
                                <div className="bg-gradient-to-br from-white via-rose-50/30 to-pink-50/30 rounded-xl shadow-lg border border-rose-100/50 overflow-hidden">
                                    <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-2">
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-base font-bold text-white">Current Medications</h3>
                                            </div>
                                            <button
                                                onClick={() => router.push('/medications')}
                                                className="text-rose-100 hover:text-white text-xs font-medium transition-colors"
                                            >
                                                View All →
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        {currentMedications.length > 0 ? (
                                            <div className="space-y-3">
                                                {currentMedications.slice(0, 3).map((medication) => (
                                                    <div key={medication.id} className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border border-rose-100/50 hover:shadow-sm transition-all duration-200">
                                                        <p className="font-bold text-gray-900 text-sm mb-1">{medication.medicationName}</p>
                                                        <p className="text-gray-600 mb-2 text-xs">{medication.dosage || 'Dosage not specified'} • {medication.instructions || 'Instructions not available'}</p>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs text-gray-500">Prescribed: <span className="font-medium text-gray-700">{formatDate(medication.dateIssued)}</span></p>
                                                            {medication.prescribingDoctor && (
                                                                <p className="text-xs text-blue-600 font-medium">Dr. {medication.prescribingDoctor}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-600 font-medium text-sm">No current medications</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Health Metrics & Goals */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* BMI Calculator */}
                                <div className="bg-white rounded-xl shadow-lg p-4">
                                    <h3 className="text-base font-semibold text-gray-900 mb-3">BMI Calculator</h3>
                                    <div className="space-y-3">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600 mb-1">
                                                {currentBMI ? currentBMI.toFixed(1) : '--'}
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                {currentBMI ? (currentBMI < 18.5 ? 'Underweight' : 
                                                               currentBMI < 25 ? 'Normal' : 
                                                               currentBMI < 30 ? 'Overweight' : 'Obese') : 'No BMI data'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-200 rounded-full h-1.5">
                                            <div className="bg-green-500 h-1.5 rounded-full" 
                                                 style={{ width: currentBMI ? `${Math.min((currentBMI / 40) * 100, 100)}%` : '0%' }}></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Underweight</span>
                                            <span>Normal</span>
                                            <span>Overweight</span>
                                            <span>Obese</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Health Goals - Placeholder for future implementation */}
                                <div className="bg-white rounded-xl shadow-lg p-4">
                                    <h3 className="text-base font-semibold text-gray-900 mb-3">Health Goals</h3>
                                    <div className="text-center py-4">
                                        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <h4 className="text-sm font-medium text-gray-900 mb-1">Personal Health Goals</h4>
                                        <p className="text-gray-600 text-xs mb-3">Set and track your personal health objectives</p>
                                        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs">
                                            Set Goals
                                        </button>
                                    </div>
                                </div>

                                {/* Wellness Score - Placeholder for future implementation */}
                                <div className="bg-white rounded-xl shadow-lg p-4">
                                    <h3 className="text-base font-semibold text-gray-900 mb-3">Wellness Score</h3>
                                    <div className="text-center">
                                        <div className="relative w-16 h-16 mx-auto mb-3">
                                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="#E5E7EB"
                                                    strokeWidth="2"
                                                />
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="#9CA3AF"
                                                    strokeWidth="2"
                                                    strokeDasharray="50, 100"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-lg font-bold text-gray-900">--</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600">Coming Soon</p>
                                        <p className="text-xs text-gray-500 mt-1">Comprehensive wellness tracking</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Recent Activity & Quick Stats */}
                        <div className="space-y-8">
                            {/* Enhanced Recent Activity Feed */}
                            <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 rounded-2xl shadow-xl border border-amber-100/50 overflow-hidden">
                                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4">
                                    <h3 className="text-lg font-bold text-white flex items-center">
                                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        Recent Activity
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <div className="space-y-3">
                                        {recentActivities.slice(0, 6).map((activity) => (
                                            <div 
                                                key={activity.id} 
                                                className="flex items-start space-x-3 p-3 bg-gradient-to-r from-white to-amber-50/50 rounded-lg border border-amber-100/50 hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
                                                onClick={() => {
                                                    // Navigate based on activity type
                                                    switch (activity.type) {
                                                        case 'appointment':
                                                            router.push('/appointments');
                                                            break;
                                                        case 'message':
                                                            router.push('/messages');
                                                            break;
                                                        case 'lab':
                                                            router.push('/labs');
                                                            break;
                                                        case 'medication':
                                                            router.push('/medications');
                                                            break;
                                                        case 'education':
                                                            router.push('/education');
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }}
                                            >
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${
                                                    activity.type === 'appointment' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                                    activity.type === 'message' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                                    activity.type === 'lab' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                                                    activity.type === 'medication' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                                    'bg-gradient-to-br from-orange-500 to-orange-600'
                                                } transition-transform group-hover:scale-110`}>
                                                    {activity.type === 'appointment' && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                    {activity.type === 'message' && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                        </svg>
                                                    )}
                                                    {activity.type === 'lab' && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    )}
                                                    {activity.type === 'medication' && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                                                        </svg>
                                                    )}
                                                    {activity.type === 'education' && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 7v-6"/>
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{activity.title}</p>
                                                        {activity.status === 'unread' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-400 to-red-500 text-white shadow-sm">
                                                                Unread
                                                            </span>
                                                        )}
                                                        {activity.status === 'new' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm">
                                                                New
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-600 mb-2 text-xs leading-tight">{activity.description}</p>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ml-2">
                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <div className="text-center pt-4">
                                            <button
                                                onClick={() => router.push('/messages')}
                                                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:from-amber-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                            >
                                                View All Activity
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">Health Overview</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">Account Status</span>
                                        </div>
                                        <span className="text-sm font-semibold text-green-600">Active</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">Next Appointment</span>
                                        </div>
                                        <span className="text-sm font-semibold text-blue-600">
                                            {upcomingAppointments.length > 0
                                                ? formatDate(upcomingAppointments[0].appointmentDate)
                                                : 'None scheduled'
                                            }
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">Active Medications</span>
                                        </div>
                                        <span className="text-sm font-semibold text-purple-600">{currentMedications.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </AdminLayout>
);
}

export default function Dashboard() {
    // Only show patient dashboard for now
    return <PatientDashboard />;
}