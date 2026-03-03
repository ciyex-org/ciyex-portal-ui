"use client";

import { getEnv } from "@/utils/env";
import { useState, useEffect, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import ReCAPTCHA from "react-google-recaptcha";

interface Org {
  id?: number;
  orgAlias: string;
  orgName: string;
  address?: string;
}

interface PortalApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

interface PortalUserDto {
  userId: number;
  fhirId?: string;
  email: string;
  firstName: string;
  lastName: string;
  orgAlias?: string;
  role?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [orgSearch, setOrgSearch] = useState("");
  const [orgResults, setOrgResults] = useState<Org[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    dateOfBirth: "",
    gender: "",
    phoneNumber: "",
    street: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    securityQuestion: "",
    securityAnswer: "",
    orgAlias: "",
  });

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function getErrorMessage(err: unknown): string {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message?: unknown }).message);
    return String(err ?? 'Unknown error');
  }

  // 🔹 Org search with autocomplete
  useEffect(() => {
    // Skip search if an org was already selected
    if (form.orgAlias) {
      setOrgResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      if (orgSearch.trim().length < 2) {
        setOrgResults([]);
        return;
      }
      try {
        const res = await fetch(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/portal/orgs/search?query=${encodeURIComponent(orgSearch)}`,
          { headers: { Accept: "application/json" } }
        );
        const text = await res.text();
        let data: PortalApiResponse<Org[]>;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Non-JSON response:", text);
          setOrgResults([]);
          return;
        }
        if (data.success && data.data) {
          setOrgResults(data.data);
          setHighlightIndex(0); // always highlight first
        } else {
          setOrgResults([]);
        }
      } catch (err) {
        console.error("Failed to search orgs", err);
        setOrgResults([]);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSearch, form.orgAlias]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleCaptcha = (token: string | null) => setCaptchaToken(token);

  // ⌨️ Keyboard navigation for autocomplete
  const handleOrgKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!orgResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % orgResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev === 0 ? orgResults.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = orgResults[highlightIndex];
      if (selected) {
        setForm({ ...form, orgAlias: selected.orgAlias });
        setOrgSearch(selected.orgName);
        setOrgResults([]);
      }
    }
  };

  // 🔹 Normal sign up
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (getEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY") && !captchaToken) {
      setError("Please verify the captcha.");
      return;
    }
    if (!form.orgAlias) {
      setError("Please select an organization.");
      return;
    }
    setLoading(true);

    try {
      const payload = { ...form, captcha: captchaToken, role: "PATIENT" };
      // ✅ Use plain fetch for registration (no auth required)
      const res = await fetch(`${getEnv("NEXT_PUBLIC_API_URL")}/api/portal/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data: PortalApiResponse<PortalUserDto> = JSON.parse(text);
      if (!data.success || !data.data) throw new Error(data.message);

      // Portal self-registration is always PATIENT (role may not be in response)
      setForm({
        firstName: "", middleName: "", lastName: "", email: "", password: "",
        dateOfBirth: "", gender: "", phoneNumber: "", street: "", city: "",
        state: "", country: "", postalCode: "", securityQuestion: "",
        securityAnswer: "", orgAlias: ""
      });
      setOrgSearch("");
      setCaptchaToken(null);

      alert("Registration successful! Your account is pending approval. You will receive an email notification once your account is approved by the healthcare provider.");

      // Redirect to signin page
      router.push("/signin");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Google sign up
  const handleGoogleSignUp = async () => {
    try {
      const result = await signIn("google", { redirect: false });
      if (!result || result.error) throw new Error("Google sign-in failed");

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      if (!session?.user?.email) throw new Error("Google profile not found");

      const res = await fetch(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/portal/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: session.user.name?.split(" ")[0] || "",
            lastName: session.user.name?.split(" ")[1] || "",
            email: session.user.email,
            password: crypto.randomUUID(),
            orgAlias: form.orgAlias || "", // org from dropdown
            role: "PATIENT",
          }),
        }
      );

      const text = await res.text();
      const data: PortalApiResponse<PortalUserDto> = JSON.parse(text);
      if (!data.success || !data.data) throw new Error(data.message);

      // Show success message about approval process for Google signup
      alert("Registration successful! Your account is pending approval. You will receive an email notification once your account is approved by the healthcare provider.");
      
      // Redirect to signin page
      router.push("/signin");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Google signup failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/images/patient-portal-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-white/70"></div>
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        
        {/* Left Panel */}
        {/* Left Panel */}
<div
  className="flex flex-col justify-center px-10 py-12 text-white relative bg-gradient-to-br from-purple-900 via-blue-700 to-cyan-500"
  style={{
    backgroundImage: "url('/images/patient-portal-bg.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Overlay for readability */}
  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-blue-800/75 to-cyan-600/80"></div>

  {/* Content */}
  <div className="relative z-10 space-y-8">
    {/* Logo & Title */}
    <div>
      <h1 className="text-5xl font-extrabold mb-3 tracking-tight flex items-center gap-3">
        ✨ Ciyex Connect
      </h1>
      <p className="text-xl md:text-2xl font-semibold leading-snug">
        Your Health. <span className="font-extrabold">Your Control.</span>
      </p>
    </div>

    {/* Features */}
    <ul className="space-y-5 text-lg md:text-xl font-medium">
      <li className="flex items-center gap-3">
        <span className="text-3xl">🩺</span>
        <span className="leading-snug">Access your <br /> medical history</span>
      </li>
      <li className="flex items-center gap-3">
        <span className="text-3xl">📊</span>
        <span className="leading-snug">Track labs <br /> & vitals</span>
      </li>
      <li className="flex items-center gap-3">
        <span className="text-3xl">💊</span>
        <span className="leading-snug">Manage <br /> prescriptions</span>
      </li>
      <li className="flex items-center gap-3">
        <span className="text-3xl">📅</span>
        <span className="leading-snug">Book <br /> appointments</span>
      </li>
      <li className="flex items-center gap-3">
        <span className="text-3xl">🔒</span>
        <span className="leading-snug">Secure <br /> messaging</span>
      </li>
    </ul>

    {/* Decorative gradient bar */}
    <div className="w-28 h-1 bg-gradient-to-r from-yellow-300 to-pink-400 rounded-full mt-8"></div>
  </div>
</div>


        {/* Right Panel */}
        <div className="p-6 flex flex-col justify-center">
          <h2 className="text-lg font-bold mb-3 text-center">Sign Up</h2>
          {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}

          {/* Form */}
          <form onSubmit={handleSignUp} className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} className="border rounded px-2 py-1" required />
            <input name="middleName" placeholder="Middle Name" value={form.middleName} onChange={handleChange} className="border rounded px-2 py-1" />
            <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} className="border rounded px-2 py-1" required />
            <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="border rounded px-2 py-1" required />
            <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="border rounded px-2 py-1" required />
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} className="border rounded px-2 py-1" required />
            <input name="gender" placeholder="Gender" value={form.gender} onChange={handleChange} className="border rounded px-2 py-1" />
            <input name="phoneNumber" placeholder="Phone" value={form.phoneNumber} onChange={handleChange} className="border rounded px-2 py-1" />
            <input name="street" placeholder="Street" value={form.street} onChange={handleChange} className="border rounded px-2 py-1 col-span-2" />
            <input name="city" placeholder="City" value={form.city} onChange={handleChange} className="border rounded px-2 py-1" />
            <input name="state" placeholder="State" value={form.state} onChange={handleChange} className="border rounded px-2 py-1" />
            <input name="country" placeholder="Country" value={form.country} onChange={handleChange} className="border rounded px-2 py-1" />
            <input name="postalCode" placeholder="Postal Code" value={form.postalCode} onChange={handleChange} className="border rounded px-2 py-1" />
            <input name="securityQuestion" placeholder="Security Question" value={form.securityQuestion} onChange={handleChange} className="border rounded px-2 py-1 col-span-2" />
            <input name="securityAnswer" placeholder="Security Answer" value={form.securityAnswer} onChange={handleChange} className="border rounded px-2 py-1 col-span-2" />

            {/* Org Lookup */}
            <input
              placeholder="Search organization..."
              value={orgSearch}
              onChange={(e) => {
                setOrgSearch(e.target.value);
                if (form.orgAlias) setForm({ ...form, orgAlias: "" });
              }}
              onKeyDown={handleOrgKeyDown}
              className="border rounded px-2 py-1 col-span-2"
            />
            {orgResults.length > 0 && (
              <div className="col-span-2 border rounded bg-white shadow max-h-32 overflow-y-auto">
                {orgResults.map((org, idx) => (
                  <div
                    key={org.orgAlias}
                    onClick={() => {
                      setForm({ ...form, orgAlias: org.orgAlias });
                      setOrgSearch(org.orgName);
                      setOrgResults([]);
                    }}
                    className={`cursor-pointer px-2 py-1 ${
                      idx === highlightIndex ? "bg-blue-100" : "hover:bg-gray-100"
                    }`}
                  >
                    {org.orgName}
                  </div>
                ))}
              </div>
            )}

            {/* Captcha */}
            {getEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY") && (
              <div className="flex justify-center col-span-2 my-2">
                <ReCAPTCHA sitekey={getEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY") as string} onChange={handleCaptcha} />
              </div>
            )}

            <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 col-span-2">
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          {/* Google Sign-up */}
          <button type="button" onClick={handleGoogleSignUp} className="w-full flex items-center justify-center gap-2 border py-2 rounded mt-3 hover:bg-gray-50 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.98 30.47.5 24 .5 14.82.5 7.02 6.56 3.69 14.88l7.98 6.2C13.21 14.62 18.21 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.09-.39-4.5H24v9h12.7c-.56 2.9-2.27 5.36-4.87 7.04l7.6 5.9C43.73 38.6 46.5 32.1 46.5 24.5z"/>
              <path fill="#FBBC05" d="M11.67 28.32c-.5-1.48-.79-3.05-.79-4.82s.29-3.34.79-4.82l-7.98-6.2C1.63 15.84.5 19.74.5 24s1.13 8.16 3.19 11.52l7.98-6.2z"/>
              <path fill="#34A853" d="M24 47.5c6.48 0 11.93-2.13 15.91-5.78l-7.6-5.9c-2.11 1.42-4.8 2.28-8.31 2.28-5.79 0-10.79-5.12-12.33-11.58l-7.98 6.2C7.02 41.44 14.82 47.5 24 47.5z"/>
            </svg>
            <span>Sign up with Google</span>
          </button>

          <p className="mt-3 text-center text-xs text-gray-600">
            Already have an account? <a href="/signin" className="text-blue-600 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
