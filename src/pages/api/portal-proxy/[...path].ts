import { getEnv } from "@/utils/env";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Unified Patient Portal Proxy
 * 
 * Forwards all requests to Spring Boot /api/portal/* endpoints
 * This matches the pattern used for providers and locations.
 * 
 * Usage examples:
 *  - /api/portal-proxy/list-options/VisitType → /api/portal/list-options/list/VisitType
 *  - /api/portal-proxy/providers → /api/portal/providers
 *  - /api/portal-proxy/locations → /api/portal/locations
 *  - /api/portal-proxy/appointments/available-slots → /api/portal/appointments/available-slots
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const backend = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";
    const path = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path || "";
    
    // Special handling for list-options to match backend endpoint structure
    // Frontend calls: /api/portal-proxy/list-options/{listId}
    // Backend expects: /api/portal/list-options/list/{listId}
    let targetPath = path;
    if (path.startsWith("list-options/")) {
      const listId = path.replace("list-options/", "");
      const encodedListId = encodeURIComponent(listId);
      targetPath = `list-options/list/${encodedListId}`;
    }
    
    const target = `${backend}/api/portal/${targetPath}`;

    // Build query string if present
    const queryString = new URLSearchParams(
      Object.entries(req.query)
        .filter(([key]) => key !== "path")
        .map(([key, value]) => [key, String(value)])
    ).toString();
    
    const targetUrl = queryString ? `${target}?${queryString}` : target;

    console.log("🔹 [portal-proxy] Forwarding request:", {
      method: req.method,
      from: req.url,
      to: targetUrl,
      hasAuth: !!req.headers.authorization,
    });

    // If Authorization header is present, decode token payload (non-verified) to log orgIds
    const authHeader = req.headers.authorization;
    function decodeJwtPayload(token?: string) {
      if (!token) return null;
      try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1];
        // base64url -> base64
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const json = Buffer.from(padded, 'base64').toString('utf8');
        return JSON.parse(json);
      } catch {
        return null;
      }
    }

    const decoded = decodeJwtPayload((authHeader || '').replace(/^Bearer\s+/i, ''));
    if (decoded) {
      console.log('🔹 [portal-proxy] Token payload keys:', Object.keys(decoded));
      if (decoded.orgIds || decoded.orgs) {
        console.log('🔹 [portal-proxy] Token orgs/orgIds snapshot:', { orgIds: decoded.orgIds || decoded.orgs });
      }
    }

    // --- Proactive fallback: if frontend token belongs to portal (orgId 1) or has no orgIds,
    // try the master list-options endpoint using a service token (if configured).
    // This mirrors the fallback attempted after 401 but helps avoid the 401 in the first place
    // for known problematic portal tokens.
    const serviceToken = process.env.EHR_SERVICE_TOKEN;
    try {
  const maybeOrgIds = decoded && (decoded.orgIds || (decoded.orgs && (decoded.orgs as unknown[]).map((o: unknown) => (o as Record<string, unknown>).orgId)));
      const firstOrg = Array.isArray(maybeOrgIds) && maybeOrgIds.length ? maybeOrgIds[0] : undefined;
      if (path.startsWith('list-options/') && serviceToken && (firstOrg === 1 || firstOrg === undefined)) {
        const fallbackUrl = `${backend}/api/master/list-options/list/${path.replace(/^list-options\//, '')}`;
        console.warn('🔁 [portal-proxy] Proactive fallback to master list-options because token looks like portal token', { to: fallbackUrl, firstOrg });
        const fbResp = await fetch(fallbackUrl, { headers: { Accept: 'application/json', Authorization: `Bearer ${serviceToken}` }, method: 'GET' });
        const fbText = await fbResp.text();
        try {
          const fbJson = JSON.parse(fbText);
          return res.status(fbResp.ok ? 200 : fbResp.status).json(fbJson);
        } catch {
          console.error('❌ [portal-proxy] Master fallback returned invalid JSON', { to: fallbackUrl, body: fbText.slice(0, 400) });
          // continue to the normal forwarding flow if fallback fails to parse
        }
      }
    } catch (err) {
      console.error('❌ [portal-proxy] Error during proactive fallback check', err);
      // ignore and continue forwarding normally
    }

    // Forward headers from the client request
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // Pass through Authorization header (patient JWT token)
    if (req.headers.authorization) {
      headers["Authorization"] = String(req.headers.authorization);
    }

    // Make the request to Spring Boot backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" 
        ? JSON.stringify(req.body) 
        : undefined,
      credentials: "include",
    });

    console.log("🔹 [portal-proxy] Backend response:", {
      status: response.status,
      statusText: response.statusText,
    });

    // Read response
    const text = await response.text();

    // Quickly handle common non-JSON / auth responses
    if (response.status === 401) {
      // Mask token for logs
      const masked = authHeader && authHeader.startsWith('Bearer ') ? `Bearer ${String(authHeader).substring(7, 12)}...` : authHeader || '';
      console.error('❌ [portal-proxy] Backend returned 401 Unauthorized', { to: targetUrl, auth: masked, body: text.slice(0, 400) });

      // If a fallback service token is available, try the master endpoint as a last resort
      const serviceToken = process.env.EHR_SERVICE_TOKEN;
      if (serviceToken) {
        try {
          const fallbackUrl = `${backend}/api/master/list-options/list/${path.replace(/^list-options\//, '')}`;
          console.warn('🔁 [portal-proxy] Attempting fallback to master endpoint', { to: fallbackUrl });
          const fbResp = await fetch(fallbackUrl, { headers: { Accept: 'application/json', Authorization: `Bearer ${serviceToken}` }, method: 'GET' });
          const fbText = await fbResp.text();
          try {
            const fbJson = JSON.parse(fbText);
            return res.status(fbResp.ok ? 200 : fbResp.status).json(fbJson);
          } catch {
            return res.status(502).json({ success: false, message: 'Fallback returned non-JSON', data: [] });
          }
        } catch (fbErr) {
          console.error('❌ [portal-proxy] Fallback to master endpoint failed', fbErr);
        }
      }

      return res.status(401).json({ success: false, message: 'Unauthorized', data: [] });
    }

    // If backend returned no body, forward status
    if (!text || !text.trim()) {
      if (!response.ok) {
        return res.status(response.status).json({ success: false, message: response.statusText || 'Backend error', data: [] });
      }
      return res.status(response.status).json({ success: true, message: 'No content', data: [] });
    }

    // Try parse JSON only when there's a body
    let json: any;
    try {
      json = JSON.parse(text);
  } catch {
      console.error('❌ [portal-proxy] Invalid JSON from backend:', text.slice(0, 200));
      // If backend errored but returned non-JSON, forward a reasonable error
      if (!response.ok) {
        return res.status(502).json({ success: false, message: text || response.statusText || 'Backend error', data: [] });
      }
      return res.status(502).json({ success: false, message: 'Invalid JSON response from backend', data: [] });
    }

    // Handle non-OK responses now that we have parsed JSON
    if (!response.ok) {
      console.error('❌ [portal-proxy] Backend error:', { status: response.status, message: json?.message || response.statusText });
      return res.status(response.status).json({ success: false, message: json?.message || response.statusText || 'Backend request failed', data: json?.data || [] });
    }

    // Return successful response
    return res.status(200).json(json);
    
  } catch (err: unknown) {
    console.error("❌ [portal-proxy] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      message: `Proxy error: ${message}`,
      data: null,
    });
  }
}
