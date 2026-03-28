import { getEnv } from "@/utils/env";
import { refreshAccessToken, clearAuth } from "@/utils/authUtils";

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : undefined;

  if (!token) {
    if (typeof window !== "undefined") {
      window.location.href = "/signin";
    }
    throw new Error("Auth token missing");
  }

  const orgAlias = getEnv("NEXT_PUBLIC_ORG_ALIAS")
    || (typeof window !== "undefined" ? localStorage.getItem("orgAlias") : null)
    || "";
  const authHeaders: Record<string, string> = {
    "Accept": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgAlias ? { "X-Org-Alias": orgAlias } : {}),
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
      : `${getEnv("NEXT_PUBLIC_API_URL")}${input}`;
  } else {
    url = (input as Request).url;
  }

  // Abort requests that take longer than 15 seconds to prevent hanging
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const mergedInit = { ...init, headers: mergedHeaders, credentials: 'include' as RequestCredentials, signal: init.signal || controller.signal };

  let response: Response;
  try {
    response = await fetch(url, mergedInit);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    // Try to refresh the token before giving up
    try {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request with the new token
        const newToken = localStorage.getItem("token");
        const retryHeaders = new Headers(init.headers || {});
        Object.entries({
          "Accept": "application/json",
          ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
          ...(orgAlias ? { "X-Org-Alias": orgAlias } : {}),
        }).forEach(([k, v]) => retryHeaders.set(k, v));

        if (isFormData) {
          retryHeaders.delete("Content-Type");
        } else if (!retryHeaders.has("Content-Type")) {
          retryHeaders.set("Content-Type", "application/json");
        }

        const retryRes = await fetch(url, { ...init, headers: retryHeaders, credentials: 'include' });
        if (retryRes.status !== 401) {
          return retryRes;
        }
      }
    } catch {
      // refresh threw — fall through to sign-out
    }

    // Refresh failed or retry still got 401 — redirect to sign-in
    console.warn("⚠️ 401 Unauthorized - Session expired, redirecting to sign-in:", input);
    if (typeof window !== "undefined") {
      clearAuth();
      window.location.href = "/signin";
    }
  }

  return response;
}
