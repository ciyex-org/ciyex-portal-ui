import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

export interface Provider {
    id: number;
    fullName: string;
    title: string;
    phone: string;
    email: string;
    keycloakUserId?: string;
    identification: {
        firstName: string;
        lastName: string;
    };
    professionalDetails?: {
        specialty: string;
        location?: string;
        workingHours?: string;
        experience?: string;
        languages?: string[];
    };
}

export function useProviders() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProviders = async () => {
        setLoading(true);
        setError(null);
        try {
            // First attempt: portal-specific endpoint
            let response = await fetchWithAuth('/api/portal/providers');
            if (!response.ok) {
                console.warn('[useProviders] /api/portal/providers failed with', response.status, response.statusText);
                // Fallback: generic providers endpoint (EHR style)
                response = await fetchWithAuth('/api/providers');
                if (!response.ok) {
                    console.error('[useProviders] Fallback /api/providers failed with', response.status, response.statusText);
                    throw new Error(`Provider fetch failed (portal:${response.status})`);
                }
            }

            const data = await response.json();

            // Normalize different ApiResponse wrappers (portal vs generic)
            const apiSuccess = data?.success === true || Array.isArray(data?.data) || Array.isArray(data);
            type RawProvider = {
                id: number;
                fullName?: string;
                title?: string;
                phone?: string;
                email?: string;
                keycloakUserId?: string;
                systemAccess?: { keycloakUserId?: string };
                name?: string;
                contactPhone?: string;
                contactEmail?: string;
                identification?: { firstName?: string; lastName?: string };
                professionalDetails?: {
                    specialty?: string;
                    title?: string;
                    location?: string;
                    workingHours?: string;
                    experience?: string;
                    languages?: string[];
                };
                specialty?: string;
                location?: string;
                workingHours?: string;
                experience?: string;
                languages?: string[];
                firstName?: string;
                lastName?: string;
            };
            const providerArray: RawProvider[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

            if (!apiSuccess) {
                console.error('[useProviders] Unexpected provider response shape', data);
                throw new Error(data?.message || 'Failed to fetch providers');
            }

            // Map DTOs to Provider shape expected by UI
            const mapped: Provider[] = providerArray.map((p: RawProvider) => ({
                id: p.id,
                fullName: p.fullName || [p.identification?.firstName, p.identification?.lastName].filter(Boolean).join(' ') || p.name || 'Unknown',
                title: p.title || p.professionalDetails?.title || '',
                phone: p.phone || p.contactPhone || '',
                email: p.email || p.contactEmail || '',
                keycloakUserId: p.keycloakUserId || p.systemAccess?.keycloakUserId || '',
                identification: {
                    firstName: p.identification?.firstName || p.firstName || '',
                    lastName: p.identification?.lastName || p.lastName || ''
                },
                professionalDetails: {
                    specialty: p.professionalDetails?.specialty || p.specialty || '',
                    location: p.professionalDetails?.location || p.location || '',
                    workingHours: p.professionalDetails?.workingHours || p.workingHours || '',
                    experience: p.professionalDetails?.experience || p.experience || '',
                    languages: p.professionalDetails?.languages || p.languages || []
                }
            }));

            setProviders(mapped);
        } catch (err) {
            console.error('[useProviders] Fetch providers error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const searchProviders = (query: string): Provider[] => {
        if (!query.trim()) return providers;

        const lowerQuery = query.toLowerCase();
        return providers.filter(provider =>
            provider.fullName.toLowerCase().includes(lowerQuery) ||
            provider.title?.toLowerCase().includes(lowerQuery) ||
            provider.professionalDetails?.specialty?.toLowerCase().includes(lowerQuery) ||
            provider.email?.toLowerCase().includes(lowerQuery)
        );
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    return {
        providers,
        loading,
        error,
        refetch: fetchProviders,
        searchProviders
    };
}

/**
 * Returns only providers the patient has had appointments with (care team).
 * Used by messaging to restrict which providers a patient can message.
 */
export function useCareTeamProviders() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProviders = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth('/api/portal/my-providers');
            if (!response.ok) {
                throw new Error(`Care team fetch failed: ${response.status}`);
            }

            const data = await response.json();
            type RawProvider = {
                id: number;
                fullName?: string;
                title?: string;
                phone?: string;
                email?: string;
                keycloakUserId?: string;
                systemAccess?: { keycloakUserId?: string };
                name?: string;
                contactPhone?: string;
                contactEmail?: string;
                identification?: { firstName?: string; lastName?: string };
                professionalDetails?: {
                    specialty?: string;
                    title?: string;
                    location?: string;
                    workingHours?: string;
                    experience?: string;
                    languages?: string[];
                };
                specialty?: string;
                firstName?: string;
                lastName?: string;
            };
            const providerArray: RawProvider[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

            const mapped: Provider[] = providerArray.map((p: RawProvider) => ({
                id: p.id,
                fullName: p.fullName || [p.identification?.firstName, p.identification?.lastName].filter(Boolean).join(' ') || p.name || 'Unknown',
                title: p.title || p.professionalDetails?.title || '',
                phone: p.phone || p.contactPhone || '',
                email: p.email || p.contactEmail || '',
                keycloakUserId: p.keycloakUserId || p.systemAccess?.keycloakUserId || '',
                identification: {
                    firstName: p.identification?.firstName || p.firstName || '',
                    lastName: p.identification?.lastName || p.lastName || ''
                },
                professionalDetails: {
                    specialty: p.professionalDetails?.specialty || p.specialty || '',
                    location: p.professionalDetails?.location || '',
                    workingHours: p.professionalDetails?.workingHours || '',
                    experience: p.professionalDetails?.experience || '',
                    languages: p.professionalDetails?.languages || []
                }
            }));

            setProviders(mapped);
        } catch (err) {
            console.error('[useCareTeamProviders] Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    return {
        providers,
        loading,
        error,
        refetch: fetchProviders
    };
}