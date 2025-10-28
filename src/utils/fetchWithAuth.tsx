export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  let token = typeof window !== "undefined" ? localStorage.getItem("token") : undefined;
  let orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : undefined;

  // 🕒 Wait for token to appear (after login redirect)
  let attempts = 0;
  while (!token && attempts < 15) {
    await new Promise(r => setTimeout(r, 200));
    token = typeof window !== "undefined" ? localStorage.getItem("token") : undefined;
    orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : undefined;
    attempts++;
  }

  if (!token) {
    console.error("❌ Missing token even after waiting");
    if (typeof window !== "undefined") {
      window.location.href = "/signin";
    }
    throw new Error("Auth token missing");
  }

  // If orgId not in localStorage, try to extract from JWT token
  if (!orgId && token) {
    try {
      const { getOrgIdsFromToken } = await import('./jwtHelper');
      const orgIds = getOrgIdsFromToken();
      if (orgIds.length > 0) {
        orgId = orgIds[0].toString();
        // Save it for future use
        if (typeof window !== "undefined") {
          localStorage.setItem("orgId", orgId);
        }
      }
    } catch (e) {
      console.warn("Could not extract orgId from token:", e);
    }
  }

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.debug('🔍 fetchWithAuth debug:', {
      hasToken: !!token,
      tokenLength: token?.length,
      hasOrgId: !!orgId,
      orgId,
      url: typeof input === "string" ? input : input.url
    });
  }

  const authHeaders: Record<string, string> = {
    "Accept": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { "x-org-id": orgId } : {}),   // ✅ use x-org-id to match backend
  };

  // Don't set Content-Type for FormData - let browser set it automatically
  const isFormData = init.body instanceof FormData;
  if (!isFormData) {
    authHeaders["Content-Type"] = "application/json";
  }

  const mergedHeaders = new Headers(init.headers || {});
  Object.entries(authHeaders).forEach(([key, value]) => {
    if (!mergedHeaders.has(key)) mergedHeaders.set(key, value);
  });

  let url: string;
  if (typeof input === "string") {
    url = /^https?:\/\//i.test(input)
      ? input
      : `${process.env.NEXT_PUBLIC_API_URL}${input}`;
  } else {
    url = (input as Request).url;
  }

  const response = await fetch(url, { ...init, headers: mergedHeaders, credentials: 'include' });

  // ✅ Don't redirect on 401 - let the page handle errors gracefully
  if (response.status === 401) {
    console.warn("⚠️ Unauthorized (token expired or insufficient permissions)");
    // Check if token is expired
    try {
      const { isTokenExpired } = await import('./jwtHelper');
      if (isTokenExpired()) {
        console.warn("🔄 Token expired, redirecting to login");
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("orgId");
          window.location.href = "/signin";
        }
        throw new Error("Token expired");
      }
    } catch (e) {
      console.warn("Could not check token expiration:", e);
      // If we can't check expiration, still redirect on 401
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("orgId");
        window.location.href = "/signin";
      }
      throw new Error("Authentication failed");
    }
  }

  return response;
}
