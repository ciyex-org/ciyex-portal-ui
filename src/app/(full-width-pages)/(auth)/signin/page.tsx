import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signin - Ciyex Portal",
  description: "Sign in to Ciyex Patient Portal",
};

export default function SignIn() {
  return <SignInForm />;
}
