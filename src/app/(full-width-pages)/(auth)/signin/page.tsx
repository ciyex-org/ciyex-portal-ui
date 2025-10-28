"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

interface Org {
  orgId: number;
  orgName: string;
  role: string;
}

interface PortalLoginResponse {
  token: string;
  userId: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  orgs: Org[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🚫 Clear any old tokens
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const payload = {
        email: form.email.trim(),
        password: form.password,
      };

      console.log("🔑 Sending login payload:", payload);

      // ✅ Use plain fetch (not fetchWithAuth) for login
      const res = await fetch(`${API_BASE}/api/portal/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Login failed with ${res.status}`);
      }

      const data: ApiResponse<PortalLoginResponse> = await res.json();

      if (!data.success || !data.data) {
        throw new Error(data.message || "Login failed.");
      }

      const user = data.data;
      console.log("✅ Login success, user:", user);

      // Save token + user for later API calls
      localStorage.setItem("token", user.token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("orgs", JSON.stringify(user.orgs || []));

      if (user.orgs?.length === 1) {
        localStorage.setItem("orgId", user.orgs[0].orgId.toString());
        localStorage.setItem("orgName", user.orgs[0].orgName);
      } else {
        localStorage.removeItem("orgId");
        localStorage.removeItem("orgName");
      }

      // ✅ redirect after login
      router.replace("/dashboard");
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/images/patient-portal-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-white/70"></div>
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col justify-center px-10 py-12 text-white bg-gradient-to-br from-purple-900 via-blue-700 to-cyan-500 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-blue-800/80 to-cyan-600/70"></div>
          <div className="relative z-10 space-y-8">
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
              ✨ Ciyex Connect
            </h1>
            <p className="text-xl font-semibold leading-snug">
              Your Health. <span className="font-extrabold">Your Control.</span>
            </p>
            <ul className="space-y-4 text-lg font-medium">
              <li>🩺 Access your medical history</li>
              <li>📊 Track labs & vitals</li>
              <li>💊 Manage prescriptions</li>
              <li>📅 Book appointments</li>
              <li>🔒 Secure messaging</li>
            </ul>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col justify-center p-10">
          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
              Sign In
            </h2>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-blue-200"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 focus:ring focus:ring-blue-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-xs text-blue-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="mt-4 w-full flex items-center justify-center gap-3 border border-gray-300 py-2 rounded-md bg-white hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.94 2.64 30.47 0 24 0 14.64 0 6.55 5.54 2.55 13.59l7.98 6.19C12.14 13.12 17.62 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.1 24.5c0-1.58-.14-3.1-.39-4.5H24v9h12.5c-.54 2.89-2.16 5.33-4.6 6.97l7.14 5.57C43.75 37.08 46.1 31.27 46.1 24.5z"/>
                <path fill="#FBBC05" d="M10.53 28.22c-1.02-2.89-1.02-6.01 0-8.9l-7.98-6.19C.94 16.7 0 20.23 0 24c0 3.77.94 7.3 2.55 10.87l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.94-2.13 15.92-5.78l-7.14-5.57c-2.01 1.36-4.59 2.15-7.58 2.15-6.38 0-11.86-3.62-13.47-8.97l-7.98 6.19C6.55 42.46 14.64 48 24 48z"/>
              </svg>
              <span className="text-gray-700 font-medium">Sign in with Google</span>
            </button>

            <p className="mt-4 text-center text-sm text-gray-600">
              Don’t have an account?{" "}
              <a href="/signup" className="text-blue-600 hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
