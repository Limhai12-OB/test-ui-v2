import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · FinanceSight" };

export default function SignInPage() {
  return (
    <AuthShell headline="Know where your money is going, in every branch.">
      <SignInForm />
    </AuthShell>
  );
}
