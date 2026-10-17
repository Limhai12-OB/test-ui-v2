import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmail } from "./verify-email";

export const metadata: Metadata = { title: "Verify your email · FinanceSight" };

export default function VerifyEmailPage() {
  return (
    <AuthShell headline="One quick check before we set up your business.">
      <Suspense>
        <VerifyEmail />
      </Suspense>
    </AuthShell>
  );
}
