"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export interface PortalFeatureConfig {
    enabled: boolean;
    [key: string]: any;
}

export interface PortalNavItem {
    key: string;
    label: string;
    icon: string;
    path: string;
    visible: boolean;
    position: number;
}

export interface PortalFormDef {
    id: number;
    formKey: string;
    formType: string;
    title: string;
    description: string;
    fieldConfig: any;
    settings: Record<string, any>;
    active: boolean;
    position: number;
}

export interface PortalConfig {
    general: {
        portalName?: string;
        welcomeMessage?: string;
        primaryColor?: string;
        registrationMode?: string;
        sessionTimeout?: number;
        allowSelfRegistration?: boolean;
        requireEmailVerification?: boolean;
        maintenanceMode?: boolean;
        maintenanceMessage?: string;
    };
    features: Record<string, PortalFeatureConfig>;
    navigation: PortalNavItem[];
    onboarding?: { enabled?: boolean };
}

let cachedConfig: PortalConfig | null = null;

/** Call on login/logout to ensure fresh config for the new user session */
export function clearPortalConfigCache() {
    cachedConfig = null;
}

export function usePortalConfig() {
    const [config, setConfig] = useState<PortalConfig | null>(cachedConfig);
    const [loading, setLoading] = useState(!cachedConfig);

    useEffect(() => {
        if (cachedConfig) return;
        (async () => {
            try {
                const res = await fetchWithAuth("/api/portal/config");
                if (res.ok) {
                    const json = await res.json();
                    // Backend wraps in ApiResponse { success, data, message }
                    const data = json.data || json;
                    cachedConfig = data;
                    setConfig(data);
                }
            } catch (err) {
                console.error("Failed to load portal config:", err);
            }
            setLoading(false);
        })();
    }, []);

    const isFeatureEnabled = (featureKey: string): boolean => {
        if (!config?.features) return true; // Default to enabled
        const feat = config.features[featureKey];
        return feat ? feat.enabled !== false : true;
    };

    const getFeatureOption = (featureKey: string, optionKey: string): any => {
        if (!config?.features) return true;
        const feat = config.features[featureKey];
        return feat ? feat[optionKey] : undefined;
    };

    const getVisibleNavItems = (): PortalNavItem[] => {
        if (!config?.navigation || config.navigation.length === 0) return [];
        return config.navigation
            .filter((n) => n.visible)
            .sort((a, b) => a.position - b.position);
    };

    return { config, loading, isFeatureEnabled, getFeatureOption, getVisibleNavItems };
}

export function usePortalForms(formType?: string) {
    const [forms, setForms] = useState<PortalFormDef[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const url = formType
                    ? `/api/portal/config/forms/active?type=${formType}`
                    : "/api/portal/config/forms/active";
                const res = await fetchWithAuth(url);
                if (res.ok) {
                    const data = await res.json();
                    setForms(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Failed to load portal forms:", err);
            }
            setLoading(false);
        })();
    }, [formType]);

    return { forms, loading };
}
