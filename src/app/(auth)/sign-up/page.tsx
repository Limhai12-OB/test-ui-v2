import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account · FinanceSight" };

export default function SignUpPage() {
  return (
    <AuthShell
      headline="Set up your business finances in minutes."
      lead="Create an owner account, add your business and your main branch, then invite your Branch Managers."
    >
      <SignUpForm />
    </AuthShell>
  );
}
