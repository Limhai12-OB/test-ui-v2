"use client";

import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPassword } from "./reset-password";

export default function ResetPasswordPage() {
  // The success frame goes back to the default brand headline.
  const [done, setDone] = useState(false);
  return (
    <AuthShell
      headline={done ? "Know where your money is going, in every branch." : "Choose a password you do not use anywhere else."}
    >
      <title>{done ? "Password updated · FinanceSight" : "Set a new password · FinanceSight"}</title>
      <Suspense>
        <ResetPassword onDone={() => setDone(true)} />
      </Suspense>
    </AuthShell>
  );
}
