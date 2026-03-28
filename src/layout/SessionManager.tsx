"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { clearAuth, refreshAccessToken } from "@/utils/authUtils";

function decodeJwt(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

// How early (in seconds) before JWT expiry to proactively refresh
const REFRESH_BEFORE_EXPIRY_SEC = 60;

// Default idle timeout when no org setting is configured (30 minutes).
const DEFAULT_IDLE_MINUTES = 30;

// Warning shown 2 minutes before idle timeout fires
const WARNING_BEFORE_MS = 2 * 60 * 1000;

// Minimum interval between refresh attempts to prevent tight loops (10 seconds)
const MIN_REFRESH_INTERVAL_MS = 10_000;

export default function SessionManager() {
  const idleTimeoutId = useRef<number | null>(null);
  const warningTimeoutId = useRef<number | null>(null);
  const refreshTimerId = useRef<number | null>(null);
  const lastRefreshAttempt = useRef<number>(0);
  const scheduleRef = useRef<(() => void) | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const countdownRef = useRef<number | null>(null);

  const dismissWarning = useCallback(async () => {
    setShowWarning(false);
    setCountdown(120);
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    const ok = await refreshAccessToken();
    // Re-schedule the proactive refresh timer after successful refresh
    if (ok && scheduleRef.current) {
      scheduleRef.current();
    }
  }, []);

  useEffect(() => {
    const idleMs = DEFAULT_IDLE_MINUTES * 60 * 1000;

    // ── Proactive JWT refresh ───────────────────────────────────
    const scheduleTokenRefresh = () => {
      if (refreshTimerId.current) {
        window.clearTimeout(refreshTimerId.current);
        refreshTimerId.current = null;
      }

      const token = localStorage.getItem("token");
      const payload = decodeJwt(token);
      if (!payload?.exp) return;

      const nowSec = Math.floor(Date.now() / 1000);
      const secsUntilExpiry = payload.exp - nowSec;

      if (secsUntilExpiry <= 0) {
        // Token already expired — try to refresh immediately (with rate limit)
        const now = Date.now();
        if (now - lastRefreshAttempt.current < MIN_REFRESH_INTERVAL_MS) return;
        lastRefreshAttempt.current = now;
        refreshAccessToken().then((ok) => {
          if (ok) scheduleTokenRefresh();
        });
        return;
      }

      // Refresh REFRESH_BEFORE_EXPIRY_SEC seconds before expiry
      // Ensure at least MIN_REFRESH_INTERVAL_MS to prevent tight loops
      const refreshInMs = Math.max(
        (secsUntilExpiry - REFRESH_BEFORE_EXPIRY_SEC) * 1000,
        MIN_REFRESH_INTERVAL_MS
      );

      refreshTimerId.current = window.setTimeout(async () => {
        lastRefreshAttempt.current = Date.now();
        const ok = await refreshAccessToken();
        if (ok) {
          scheduleTokenRefresh();
        } else {
          // Refresh failed — check if token still has time left
          const t = localStorage.getItem("token");
          const p = decodeJwt(t);
          const now2 = Math.floor(Date.now() / 1000);
          const left = p?.exp ? p.exp - now2 : 0;
          if (left > 0) {
            setShowWarning(true);
            setCountdown(Math.min(left, 120));
            if (countdownRef.current) window.clearInterval(countdownRef.current);
            countdownRef.current = window.setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  if (countdownRef.current)
                    window.clearInterval(countdownRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
      }, refreshInMs);
    };

    // Store ref so dismissWarning can call it
    scheduleRef.current = scheduleTokenRefresh;

    // ── Idle timeout ────────────────────────────────────────────
    const resetIdleTimer = () => {
      try {
        sessionStorage.setItem("lastActivity", String(Date.now()));
      } catch {}

      // If warning is showing due to idle, dismiss it on activity
      // (token refresh warnings are handled separately by dismissWarning)

      if (idleTimeoutId.current) window.clearTimeout(idleTimeoutId.current);
      if (warningTimeoutId.current) window.clearTimeout(warningTimeoutId.current);

      const warningMs = Math.max(idleMs - WARNING_BEFORE_MS, 0);
      if (warningMs > 0) {
        warningTimeoutId.current = window.setTimeout(() => {
          setShowWarning(true);
          setCountdown(Math.floor(WARNING_BEFORE_MS / 1000));
          if (countdownRef.current) window.clearInterval(countdownRef.current);
          countdownRef.current = window.setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                if (countdownRef.current)
                  window.clearInterval(countdownRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, warningMs);
      }

      idleTimeoutId.current = window.setTimeout(onIdle, idleMs);
    };

    const onIdle = () => {
      try {
        const last = Number(sessionStorage.getItem("lastActivity") || 0);
        const elapsed = Date.now() - (last || 0);
        if (elapsed < idleMs) {
          if (idleTimeoutId.current) window.clearTimeout(idleTimeoutId.current);
          idleTimeoutId.current = window.setTimeout(onIdle, idleMs - elapsed);
          return;
        }
      } catch {}

      setShowWarning(false);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      try { clearAuth(); } catch {}
      try { window.location.href = "/signin"; } catch {}
    };

    // ── Event listeners ─────────────────────────────────────────
    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((ev) =>
      window.addEventListener(ev, resetIdleTimer, { passive: true })
    );
    window.addEventListener("visibilitychange", resetIdleTimer);

    // Initialize
    resetIdleTimer();
    scheduleTokenRefresh();

    return () => {
      activityEvents.forEach((ev) =>
        window.removeEventListener(ev, resetIdleTimer)
      );
      window.removeEventListener("visibilitychange", resetIdleTimer);
      if (idleTimeoutId.current) window.clearTimeout(idleTimeoutId.current);
      if (warningTimeoutId.current) window.clearTimeout(warningTimeoutId.current);
      if (refreshTimerId.current) window.clearTimeout(refreshTimerId.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      scheduleRef.current = null;
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Session Expiring
          </h3>
        </div>
        <p className="mb-1 text-sm text-gray-600">
          Your session will expire in{" "}
          <span className="font-bold text-amber-600">
            {countdown > 60
              ? `${Math.floor(countdown / 60)}m ${countdown % 60}s`
              : `${countdown}s`}
          </span>
        </p>
        <p className="mb-5 text-sm text-gray-500">
          Click below to stay logged in, or you will be signed out
          automatically.
        </p>
        <div className="flex gap-3">
          <button
            onClick={dismissWarning}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Stay Logged In
          </button>
          <button
            onClick={() => {
              setShowWarning(false);
              clearAuth();
              window.location.href = "/signin";
            }}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
