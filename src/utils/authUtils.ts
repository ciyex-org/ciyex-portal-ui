/**
 * Authentication Utilities
 * Helper functions for handling both Keycloak and local authentication
 */

export interface UserAuth {
    token: string;
    email: string;
    fullName: string;
    authMethod: 'keycloak' | 'local';
    
    // Keycloak specific
    groups?: string[];
    userId?: string;
    
    // Local auth specific (Portal User)
    orgId?: string;
    orgIds?: number[];
    role?: string;
    portalUserId?: number;
}

/**
 * Get current authentication method
 */
export const getAuthMethod = (): 'keycloak' | 'local' | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authMethod') as 'keycloak' | 'local' | null;
};

/**
 * Check if user is authenticated with Keycloak
 */
export const isKeycloakAuth = (): boolean => {
    return getAuthMethod() === 'keycloak';
};

/**
 * Check if user is authenticated with local auth
 */
export const isLocalAuth = (): boolean => {
    return getAuthMethod() === 'local';
};

/**
 * Get user's groups (Keycloak) or empty array
 */
export const getUserGroups = (): string[] => {
    if (typeof window === 'undefined') return [];
    const groupsStr = localStorage.getItem('groups');
    if (!groupsStr) return [];
    try {
        return JSON.parse(groupsStr);
    } catch {
        return [];
    }
};

/**
 * Check if user belongs to a specific group
 */
export const hasGroup = (groupName: string): boolean => {
    const groups = getUserGroups();
    return groups.includes(groupName);
};

/**
 * Check if user belongs to any of the specified groups
 */
export const hasAnyGroup = (groupNames: string[]): boolean => {
    const groups = getUserGroups();
    return groupNames.some(groupName => groups.includes(groupName));
};

/**
 * Check if user belongs to all of the specified groups
 */
export const hasAllGroups = (groupNames: string[]): boolean => {
    const groups = getUserGroups();
    return groupNames.every(groupName => groups.includes(groupName));
};

/**
 * Get user's primary group (first group in list)
 */
export const getPrimaryGroup = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('primaryGroup');
};

/**
 * Get user's organization ID (local auth) or primary group (Keycloak)
 */
export const getUserOrgIdentifier = (): string | null => {
    if (typeof window === 'undefined') return null;
    // We no longer rely on client-side stored orgId. Prefer Keycloak primary
    // group as a display/identifier. Backend should derive tenancy from the
    // token or by mapping the Keycloak subject to a portal user.
    return getPrimaryGroup();
};

/**
 * Get current user authentication data
 */
export const getCurrentUser = (): UserAuth | null => {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const authMethod = getAuthMethod();
    if (!authMethod) return null;
    
    const email = localStorage.getItem('userEmail') || '';
    const fullName = localStorage.getItem('userFullName') || '';
    
    if (authMethod === 'keycloak') {
        return {
            token,
            email,
            fullName,
            authMethod: 'keycloak',
            groups: getUserGroups(),
            userId: localStorage.getItem('userId') || undefined,
        };
    } else {
        // Local auth: do not expose orgId/orgIds on the client anymore.
        // Keep role and portalUserId for permission checks if present.
        return {
            token,
            email,
            fullName,
            authMethod: 'local',
            orgId: undefined,
            orgIds: [],
            role: localStorage.getItem('role') || undefined,
            portalUserId: localStorage.getItem('portalUserId')
                ? parseInt(localStorage.getItem('portalUserId')!)
                : undefined,
        };
    }
};

/**
 * Check if user has access based on auth method
 * For Keycloak: checks group membership
 * For Local: checks org/role
 */
export const hasAccess = (requirement: {
    groups?: string[];
    orgId?: string;
    role?: string;
}): boolean => {
    const user = getCurrentUser();
    if (!user) return false;
    
    if (user.authMethod === 'keycloak') {
        // For Keycloak, check group membership
        if (requirement.groups && requirement.groups.length > 0) {
            return hasAnyGroup(requirement.groups);
        }
        return true;
    } else {
        // For local auth we intentionally no longer rely on client-side orgId.
        // If a specific orgId is required for access checks, we cannot
        // securely verify it in the browser; return false and log a warning.
        if (requirement.orgId) {
            console.warn('Access check requires orgId on client but orgId is not available. Backend should enforce org-based access.');
            return false;
        }
        if (requirement.role && user.role !== requirement.role) {
            return false;
        }
        return true;
    }
};

/**
 * Clear all authentication data
 */
export const clearAuth = (): void => {
    if (typeof window === 'undefined') return;
    
    // Clear common auth data
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('authMethod');
    localStorage.removeItem('user');
    
    // Clear Keycloak specific data
    localStorage.removeItem('groups');
    localStorage.removeItem('userId');
    localStorage.removeItem('primaryGroup');
    
    // Clear local auth specific data
    localStorage.removeItem('orgId');
    localStorage.removeItem('orgIds');
    localStorage.removeItem('orgs');
    localStorage.removeItem('orgName');
    localStorage.removeItem('role');
    localStorage.removeItem('portalUserId');
};

/**
 * Check if token exists (basic auth check)
 */
export const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
};

/**
 * Get authorization header for API requests
 */
export const getAuthHeader = (): { Authorization: string } | Record<string, never> => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Map group name to display name
 */
export const getGroupDisplayName = (groupName: string): string => {
    // Remove prefixes for display
    if (groupName.startsWith('org-')) {
        return groupName.substring(4).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (groupName.startsWith('role-')) {
        return groupName.substring(5).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return groupName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get all user's groups with display names
 */
export const getUserGroupsWithDisplayNames = (): Array<{ name: string; displayName: string }> => {
    const groups = getUserGroups();
    return groups.map(group => ({
        name: group,
        displayName: getGroupDisplayName(group),
    }));
};
