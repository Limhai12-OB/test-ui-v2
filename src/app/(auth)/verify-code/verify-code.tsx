"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CodeStep } from "@/components/auth/code-step";

/** Frames 04.4 "Verification Code", "Typing" and "Incorrect code". */
export function VerifyCode() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";

  return (
    <CodeStep
      title="Enter verification code"
      email={email || "your email"}
      back={{ label: "Use a different email", href: `/forgot-password?email=${encodeURIComponent(email)}` }}
      submitLabel="Verify code"
      onVerified={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
    />
  );
}
