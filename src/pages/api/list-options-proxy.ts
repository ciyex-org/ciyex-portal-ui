import { getEnv } from "@/utils/env";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Patient Portal → Proxy → EHR list-options fetcher
 * Supports both patient token passthrough and internal service token fallback.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { listId } = req.query;
    if (!listId) {
      return res.status(400).json({ success: false, message: "Missing listId", data: [] });
    }

    const backend = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";
    const target = `${backend}/api/portal/list-options/list/${encodeURIComponent(String(listId))}`;

    // 🪪 Prepare headers (patient JWT if present, fallback to service token)
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (req.headers.authorization) {
      headers["Authorization"] = String(req.headers.authorization);
    } else if (process.env.EHR_SERVICE_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.EHR_SERVICE_TOKEN}`;
    }

    console.log("🔹 [list-options-proxy] Forwarding request", {
      listId,
      target,
      hasAuth: !!headers["Authorization"],
      method: req.method,
    });

    // 🚀 Make the call to backend (portal/EHR)
    const response = await fetch(target, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    console.log("🔹 [list-options-proxy] Response:", {
      status: response.status,
      statusText: response.statusText,
    });

    const text = await response.text();

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("❌ Invalid JSON from backend:", text.slice(0, 200));
      return res.status(502).json({
        success: false,
        message: "Invalid JSON from backend server",
        data: [],
      });
    }

    if (!response.ok) {
      console.error("❌ Backend error:", json.message || response.statusText);
      return res.status(response.status).json({
        success: false,
        message: json.message || "Backend request failed",
        data: [],
      });
    }

    // ✅ Success — normalize data
    const result = {
      success: json.success ?? true,
      message: json.message ?? "Fetched successfully",
      data: json.data ?? json,
    };

    return res.status(200).json(result);
  } catch (err: unknown) {
    console.error("❌ [list-options-proxy] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, message, data: [] });
  }
}
