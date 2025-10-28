// "use client";

// import React, { useState, FormEvent } from "react";
// import { useRouter } from "next/navigation";
// import { signIn } from "next-auth/react";
// import ReCAPTCHA from "react-google-recaptcha";
// import { fetchWithAuth } from "@/utils/fetchWithAuth";
// import { useUser } from "@/hooks/useUser";


// // Types from backend
// interface Org {
//     orgId: number;
//     orgName: string;
//     roles: string[];
//     facilities: {
//         facilityId: number;
//         facilityName: string;
//         roles: string[];
//     }[];
// }

// interface LoginResponse {
//     success: boolean;
//     message: string;
//     data?: {
//         firstName: string;
//         lastName: string; // Changed from
//         phone: string;
//         dateOfBirth: number[];
//         email: string;
//         token: string;
//         orgIds: number[];
//         orgs: Org[];
//         userId: number;
//         city?: string;
//         state?: string;
//         country?: string;
//         street?: string;
//         street2?: string;
//         postalCode?: string;
//         securityQuestion?: string;
//         securityAnswer?: string;
//     };
// }

// export function PatientPortalAuth() {
//     const router = useRouter();
//     const apiUrl = process.env.NEXT_PUBLIC_API_URL;
//     const {setUser} = useUser();

//     // Separate form states
//     const [loginForm, setLoginForm] = useState({email: "", password: ""});
//     const [signupForm, setSignupForm] = useState({
//         firstName: "",
//         middleName: "",
//         lastName: "",
//         dob: "",
//         email: "",
//         phone: "",
//         password: "",
//     });
//     const normalizeDob = (dob: number[] | string | undefined): string => {
//         if (!dob) return "";
//         if (Array.isArray(dob)) {
//             const [y, m, d] = dob;
//             return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
//         }
//         return dob;
//     };




//     const [captcha, setCaptcha] = useState("");
//     const [showPassword, setShowPassword] = useState(false);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState("");

//     const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) =>
//         setLoginForm({...loginForm, [e.target.name]: e.target.value});

//     const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) =>
//         setSignupForm({...signupForm, [e.target.name]: e.target.value});

//     const handleCaptcha = (value: string | null) => {
//         console.log("Captcha token:", value); // Debug log
//         setCaptcha(value || "");
//     };

//     // -------- LOGIN --------
//     const handleSignIn = async (e: FormEvent) => {
//         e.preventDefault();
//         setError("");
//         setLoading(true);

//         try {
//             const res = await fetchWithAuth(`${apiUrl}/api/portal/auth/login`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Accept: "application/json",
//                 },
//                 body: JSON.stringify({
//                     email: loginForm.email,
//                     password: loginForm.password,
//                 }),
//             });

//             const data: LoginResponse = await res.json();

//             if (!res.ok) {
//                 throw new Error(data.message || `Login failed: HTTP ${res.status}`);
//             }

//             if (data.success && data.data) {
//                 const {
//                     token,
//                     email,
//                     firstName,
//                     lastName,
//                     phone,
//                     dateOfBirth,
//                     orgs,
//                     orgIds,
//                 } = data.data;

//                 const fullName = `${firstName} ${lastName}`.trim();
//                 const org = orgs[0];
//                 const role = org.roles?.[0] || "UNKNOWN";

//                 // Save to localStorage
//                 localStorage.setItem("orgIds", JSON.stringify(orgIds));
//                 localStorage.setItem("token", token);
//                 localStorage.setItem("userEmail", email);
//                 localStorage.setItem("userFullName", fullName);
//                 localStorage.setItem("orgId", org.orgId.toString());
//                 localStorage.setItem("role", role);

//                 if (org.facilities?.length > 0) {
//                     localStorage.setItem("facilityId", org.facilities[0].facilityId.toString());
//                 }

//                 localStorage.setItem(
//                     "user",
//                     JSON.stringify({
//                         firstName,
//                         lastName,
//                         email,
//                         phone,
//                         fullName,
//                         profileImage: "/images/user/owner.jpg",
//                         dateOfBirth,
//                         orgName: org.orgName,
//                         role,
//                         city: data.data.city,
//                         state: data.data.state,
//                         country: data.data.country,
//                         street: data.data.street,
//                         street2: data.data.street2,
//                         postalCode: data.data.postalCode,
//                         securityQuestion: data.data.securityQuestion,
//                         securityAnswer: data.data.securityAnswer,
//                     })
//                 );

//                 // Push into global user state
//                 const user = {
//                     ...data.data,
//                     dateOfBirth: normalizeDob(data.data.dateOfBirth),
//                     fullName,
//                     profileImage: "/images/user/owner.jpg",
//                     orgName: org.orgName,
//                     role,
//                 };

// // Push into global user state
//                 setUser(user);


//                 // Redirect - portal users always go to dashboard
//                 router.push("/dashboard");
//             } else {
//                 setError(data.message || "Invalid credentials");
//             }
//         } catch (err) {
//             console.error("🚨 Login error:", err);
//             setError("Something went wrong. Please try again.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     // -------- SIGNUP --------
//     const handleSignUp = async (e: FormEvent) => {
//         e.preventDefault();
//         setError("");
//         setLoading(true);

//         try {
//             const res = await fetchWithAuth(`${apiUrl}/api/portal/auth/register`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Accept: "application/json",
//                 },
//                 body: JSON.stringify({
//                     firstName: signupForm.firstName,
//                     middleName: signupForm.middleName,
//                     lastName: signupForm.lastName,
//                     dateOfBirth: signupForm.dob,
//                     email: signupForm.email,
//                     phoneNumber: signupForm.phone,
//                     password: signupForm.password,
//                     captcha,
//                 }),
//             });

//             const data: LoginResponse = await res.json();

//             if (!res.ok) {
//                 throw new Error(data.message || `Signup failed: HTTP ${res.status}`);
//             }

//             if (data.success && data.data) {
//                 const {
//                     token,
//                     email,
//                     firstName,
//                     lastName,
//                     phone,
//                     dateOfBirth,
//                     orgs,
//                     orgIds,
//                 } = data.data;

//                 const fullName = `${firstName} ${lastName}`.trim();
//                 const org = orgs[0];
//                 const role = org.roles?.[0] || "UNKNOWN";

//                 // Save to localStorage
//                 localStorage.setItem("orgIds", JSON.stringify(orgIds));
//                 localStorage.setItem("token", token);
//                 localStorage.setItem("userEmail", email);
//                 localStorage.setItem("userFullName", fullName);
//                 localStorage.setItem("orgId", org.orgId.toString());
//                 localStorage.setItem("role", role);

//                 if (org.facilities?.length > 0) {
//                     localStorage.setItem("facilityId", org.facilities[0].facilityId.toString());
//                 }

//                 localStorage.setItem(
//                     "user",
//                     JSON.stringify({
//                         firstName,
//                         lastName,
//                         email,
//                         phone,
//                         fullName,
//                         profileImage: "/images/user/owner.jpg",
//                         dateOfBirth,
//                         orgName: org.orgName,
//                         role,
//                         city: data.data.city,
//                         state: data.data.state,
//                         country: data.data.country,
//                         street: data.data.street,
//                         street2: data.data.street2,
//                         postalCode: data.data.postalCode,
//                         securityQuestion: data.data.securityQuestion,
//                         securityAnswer: data.data.securityAnswer,
//                     })
//                 );

//                 // Push into global user state
//                 const user = {
//                     ...data.data,
//                     dateOfBirth: normalizeDob(data.data.dateOfBirth),
//                     fullName,
//                     profileImage: "/images/user/owner.jpg",
//                     orgName: org.orgName,
//                     role,
//                 };

// // Push into global user state
//                 setUser(user);

//                 // Redirect
//                 router.push("/dashboard");
//             } else {
//                 setError(data.message || "Signup failed");
//             }
//         } catch (err) {
//             console.error("🚨 Signup error:", err);
//             setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div
//             className="min-h-screen flex items-center justify-center bg-cover bg-center relative px-4"
//             style={{backgroundImage: "url('/images/patient-portal-bg.jpg')"}}
//         >

//         <div className="absolute inset-0 bg-white/70"></div>

//             <div
//                 className="relative flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
//                 {/* Left Panel */}
//                 <div className="hidden md:flex flex-col justify-center w-1/2 p-10 text-white relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-blue-600 via-indigo-700 to-cyan-500">
//                     {/* Heading */}
//                     <h1 className="text-4xl font-extrabold mb-4">
//                         Welcome to{" "}
//                         <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-400">
//       Ciyex Connect
//     </span>
//                     </h1>
//                     <h2 className="text-lg font-medium mb-8 text-gray-100">
//                         Patient Portal – <span className="font-semibold">Your Health. Your Control.</span>
//                     </h2>

//                     {/* Features with Medical SVG Icons */}
//                     <div className="space-y-6 text-base leading-relaxed font-medium">
//                         <div className="flex items-center gap-3">
//                             {/* Stethoscope */}
//                             <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <path d="M6 2v6a6 6 0 0 0 12 0V2" />
//                                 <circle cx="18" cy="18" r="3" />
//                                 <path d="M9 18a9 9 0 0 0 9 9" />
//                             </svg>
//                             Communicate securely with your care team
//                         </div>

//                         <div className="flex items-center gap-3">
//                             {/* Syringe */}
//                             <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <path d="M18 2l4 4-4 4-4-4 4-4zM2 22l8-8m-4 4l4-4" />
//                                 <path d="M14 10l-4 4m-2 2l-2 2" />
//                             </svg>
//                             View lab & imaging results quickly
//                         </div>

//                         <div className="flex items-center gap-3">
//                             {/* Pills */}
//                             <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-pink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <path d="M7 7l10 10M16 8a4 4 0 1 1-8-8 4 4 0 0 1 8 8zM8 16a4 4 0 1 1-8-8 4 4 0 0 1 8 8z" />
//                             </svg>
//                             Request prescription refills anytime
//                         </div>

//                         <div className="flex items-center gap-3">
//                             {/* Calendar */}
//                             <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <rect x="3" y="4" width="18" height="18" rx="2" />
//                                 <line x1="16" y1="2" x2="16" y2="6" />
//                                 <line x1="8" y1="2" x2="8" y2="6" />
//                                 <line x1="3" y1="10" x2="21" y2="10" />
//                             </svg>
//                             Manage and reschedule appointments
//                         </div>

//                         <div className="flex items-center gap-3">
//                             {/* Clipboard */}
//                             <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                                 <rect x="9" y="2" width="6" height="4" rx="1" />
//                                 <rect x="4" y="6" width="16" height="16" rx="2" />
//                                 <line x1="8" y1="12" x2="16" y2="12" />
//                                 <line x1="8" y1="16" x2="14" y2="16" />
//                             </svg>
//                             Access & download health records
//                         </div>
//                     </div>
//                 </div>


//                 {/* Right Panel */}
//                 <div className="flex-1 p-6 md:p-8 bg-white/90 backdrop-blur-md rounded-lg shadow-md space-y-8">
//                     {/* Sign In */}
//                     <div>
//                         <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
//                             Sign In - View your Dashbaord
//                         </h2>
//                         <form onSubmit={handleSignIn} className="space-y-2 text-sm">
//                             <input
//                                 type="email"
//                                 name="email"
//                                 placeholder="Email"
//                                 value={loginForm.email}
//                                 onChange={handleLoginChange}
//                                 className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
//                             />
//                             <div className="relative">
//                                 <input
//                                     type={showPassword ? "text" : "password"}
//                                     name="password"
//                                     placeholder="Password"
//                                     value={loginForm.password}
//                                     onChange={handleLoginChange}
//                                     className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
//                                 />
//                                 <button
//                                     type="button"
//                                     onClick={() => setShowPassword(!showPassword)}
//                                     className="absolute right-3 top-2 text-xs text-blue-600"
//                                 >
//                                     {showPassword ? "Hide" : "Show"}
//                                 </button>
//                             </div>
//                             <div className="text-right">
//                                 <a href="/reset-password" className="text-xs text-blue-600 hover:underline">
//                                     Forgot password?
//                                 </a>
//                             </div>
//                             <button
//                                 type="submit"
//                                 disabled={loading}
//                                 className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-semibold"
//                             >
//                                 {loading ? "Logging in..." : "Log In"}
//                             </button>
//                         </form>

//                         {/* Google Sign In */}
//                         <button
//                             type="button"
//                             onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
//                             className="mt-2 w-full bg-white border border-gray-300 rounded-md py-2 flex items-center justify-center gap-2 text-xs font-medium hover:bg-gray-50"
//                         >
//                             <GoogleIcon /> Sign in with Google
//                         </button>
//                     </div>

//                     {/* Sign Up */}
//                     <div>
//                         <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
//                             Sign Up - Register to get started
//                         </h2>
//                         <form onSubmit={handleSignUp} className="space-y-2 text-sm">
//                             <div className="grid grid-cols-3 gap-2">
//                                 <input
//                                     name="firstName"
//                                     placeholder="First Name"
//                                     value={signupForm.firstName}
//                                     onChange={handleSignupChange}
//                                     className="border border-gray-300 rounded-md px-2 py-2 text-sm"
//                                 />
//                                 <input
//                                     name="middleName"
//                                     placeholder="Middle Name"
//                                     value={signupForm.middleName}
//                                     onChange={handleSignupChange}
//                                     className="border border-gray-300 rounded-md px-2 py-2 text-sm"
//                                 />
//                                 <input
//                                     name="lastName"
//                                     placeholder="LastName"
//                                     value={signupForm.lastName}
//                                     onChange={handleSignupChange}
//                                     className="border border-gray-300 rounded-md px-2 py-2 text-sm"
//                                 />
//                             </div>
//                             <input
//                                 type="date"
//                                 name="dob"
//                                 value={signupForm.dob}
//                                 onChange={handleSignupChange}
//                                 className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
//                             />
//                             <div className="grid grid-cols-2 gap-2">
//                                 <input
//                                     type="email"
//                                     name="email"
//                                     placeholder="Email"
//                                     value={signupForm.email}
//                                     onChange={handleSignupChange}
//                                     className="border border-gray-300 rounded-md px-2 py-2 text-sm"
//                                 />
//                                 <input
//                                     type="tel"
//                                     name="phone"
//                                     placeholder="Phone"
//                                     value={signupForm.phone}
//                                     onChange={handleSignupChange}
//                                     className="border border-gray-300 rounded-md px-2 py-2 text-sm"
//                                 />
//                             </div>
//                             <input
//                                 type="password"
//                                 name="password"
//                                 placeholder="Password"
//                                 value={signupForm.password}
//                                 onChange={handleSignupChange}
//                                 className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
//                             />

//                             <div className="flex justify-center">
//                                 <ReCAPTCHA
//                                     sitekey="6Lc_DccrAAAAAOM3CVIEfqvGyqirsBZ32QhZuXYz"
//                                     onChange={handleCaptcha}
//                                 />
//                             </div>

//                             <button
//                                 type="submit"
//                                 disabled={loading}
//                                 className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-semibold"
//                             >
//                                 {loading ? "Signing up..." : "Sign Up"}
//                             </button>
//                         </form>

//                         {/* Google Sign Up */}
//                         <button
//                             type="button"
//                             onClick={() => signIn("google", { callbackUrl: "/dashboard?newUser=true" })}
//                             className="mt-2 w-full bg-white border border-gray-300 rounded-md py-2 flex items-center justify-center gap-2 text-xs font-medium hover:bg-gray-50"
//                         >
//                             <GoogleIcon /> Sign up with Google
//                         </button>
//                     </div>

//                     {/* Error */}
//                     {error && (
//                         <div className="mt-3 text-xs text-red-600 border border-red-200 bg-red-50 py-2 px-3 rounded-md">
//                             {error}
//                         </div>
//                     )}
//                 </div>

//             </div>
//         </div>
//     );
// }

// function GoogleIcon() {
//     return (
//         <svg
//             xmlns="http://www.w3.org/2000/svg"
//             viewBox="0 0 48 48"
//             className="w-5 h-5"
//         >
//             <path
//                 fill="#4285F4"
//                 d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.77 2.67 30.23 0 24 0 14.64 0 6.52 5.34 2.56 13.07l7.98 6.2C12.27 13.05 17.7 9.5 24 9.5z"
//             />
//             <path
//                 fill="#34A853"
//                 d="M46.1 24.5c0-1.6-.14-3.16-.41-4.66H24v9.09h12.4c-.54 2.9-2.19 5.37-4.65 7.05l7.1 5.51c4.15-3.83 7.25-9.48 7.25-17z"
//             />
//             <path
//                 fill="#FBBC05"
//                 d="M10.54 28.76c-1.24-3.7-1.24-7.82 0-11.52l-7.98-6.2c-3.32 6.56-3.32 14.36 0 20.92l7.98-6.2z"
//             />
//             <path
//                 fill="#EA4335"
//                 d="M24 48c6.48 0 11.9-2.14 15.87-5.82l-7.1-5.51c-2.04 1.39-4.67 2.21-8.77 2.21-6.3 0-11.73-3.55-14.46-8.53l-7.98 6.2C6.52 42.66 14.64 48 24 48z"
//             />
//         </svg>
//     );
// }