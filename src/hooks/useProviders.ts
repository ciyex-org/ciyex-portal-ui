import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

export interface Provider {
    id: number;
    fullName: string;
    title: string;
    phone: string;
    email: string;
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
            const response = await fetchWithAuth('/api/portal/providers');
            if (!response.ok) {
                throw new Error('Failed to fetch providers');
            }
            const data = await response.json();
            if (data.success) {
                setProviders(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch providers');
            }
        } catch (err) {
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