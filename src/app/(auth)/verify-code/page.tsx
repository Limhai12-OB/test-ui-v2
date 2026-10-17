import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyCode } from "./verify-code";

export const metadata: Metadata = { title: "Enter verification code · FinanceSight" };

export default function VerifyCodePage() {
  return (
    <AuthShell headline="Locked out? You will be back in a minute.">
      <Suspense>
        <VerifyCode />
      </Suspense>
    </AuthShell>
  );
}
