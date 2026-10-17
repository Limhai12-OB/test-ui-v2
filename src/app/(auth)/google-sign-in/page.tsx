import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignIn } from "./google-sign-in";

export const metadata: Metadata = { title: "Signing in with Google · FinanceSight" };

export default function GoogleSignInPage() {
  return (
    <AuthShell headline="Know where your money is going, in every branch.">
      <Suspense>
        <GoogleSignIn />
      </Suspense>
    </AuthShell>
  );
}
