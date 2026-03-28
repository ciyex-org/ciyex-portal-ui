"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { loadEnvConfig } from "@/utils/env";

type EnvConfig = {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_BACKEND_URL: string;
  NEXT_PUBLIC_KEYCLOAK_ENABLED: string;
  NEXT_PUBLIC_KEYCLOAK_URL: string;
  NEXT_PUBLIC_KEYCLOAK_REALM: string;
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: string;
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: string;
};

const EnvContext = createContext<EnvConfig | null>(null);

export function EnvProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<EnvConfig | null>(null);

  useEffect(() => {
    loadEnvConfig().then(setConfig);
  }, []);

  if (!config) return null;

  return <EnvContext.Provider value={config}>{children}</EnvContext.Provider>;
}

export function useEnv(): EnvConfig {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error("useEnv must be used within EnvProvider");
  return ctx;
}
