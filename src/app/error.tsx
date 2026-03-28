"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page-error]", error);
    fetch("/api/error-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        location: typeof window !== "undefined" ? window.location.href : "",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center", marginTop: "4rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Page Error
      </h2>
      <p style={{ color: "#666", marginBottom: "0.5rem" }}>{error.message}</p>
      {error.digest && (
        <p style={{ color: "#999", fontSize: "0.8rem", marginBottom: "1rem" }}>
          Digest: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1.5rem",
          backgroundColor: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
