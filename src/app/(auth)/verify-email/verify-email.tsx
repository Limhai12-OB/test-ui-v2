"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CodeStep } from "@/components/auth/code-step";
import { useSession } from "@/lib/session";

/** Frame 04.2 "Sign Up — Verify email". */
export function VerifyEmail() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useSession();
  const email = params.get("email") ?? "your email";
  const name = params.get("name") ?? "New owner";

  return (
    <CodeStep
      title="Verify your email"
      email={email}
      back={{ label: "Back to sign up", href: "/sign-up" }}
      submitLabel="Verify and continue"
      onVerified={() => {
        // A verified owner continues to Business Setup (04.7).
        signIn({ name, email, role: "owner", businessName: "", firstRun: true });
        router.push("/business-setup");
      }}
    />
  );
}
