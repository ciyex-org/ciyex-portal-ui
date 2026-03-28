/**
 * JWT Helper Utilities
 * Provides functions to extract information from JWT tokens
 */

interface JWTPayload {
  sub?: string; // email
  patientId?: number;
  userId?: number;
  orgIds?: number[];
  exp?: number;
  iat?: number;
}

/**
 * Decode a JWT token without verification
 * Note: This only decodes the payload, it does NOT verify the signature
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Get patient ID from JWT token stored in localStorage
 */
export function getPatientIdFromToken(): number | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No token found in localStorage');
    return null;
  }

  const payload = decodeJWT(token);
  return payload?.patientId || payload?.userId || null;
}

/**
 * Get patient email from JWT token stored in localStorage
 */
export function getPatientEmailFromToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('token');
  if (!token) return null;

  const payload = decodeJWT(token);
  return payload?.sub || null;
}

/**
 * Get organization IDs from JWT token stored in localStorage
 */
export function getOrgIdsFromToken(): number[] {
  if (typeof window === 'undefined') return [];
  
  const token = localStorage.getItem('token');
  if (!token) return [];

  const payload = decodeJWT(token);
  return payload?.orgIds || [];
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return true;
  
  const token = localStorage.getItem('token');
  if (!token) return true;

  const payload = decodeJWT(token);
  if (!payload?.exp) return true;

  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 < Date.now();
}

/**
 * Get user identity string for telehealth (patient-{id} or patient-{email})
 */
export function getTelehealthIdentity(): string {
  const patientId = getPatientIdFromToken();
  if (patientId) {
    return `patient-${patientId}`;
  }

  const email = getPatientEmailFromToken();
  if (email) {
    return `patient-${email.split('@')[0]}`;
  }

  return `patient-${Date.now()}`;
}
