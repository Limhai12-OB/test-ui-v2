"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-shell";
import { BackLink, InfoNote, SubmitButton, TextField } from "@/components/ui/fields";
import { sendResetCode } from "@/lib/mock/auth";

/** Frame 04.3 "Forgot Password". */
export function ForgotPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(email.trim() ? "Enter a valid email address, like you@business.com." : "Enter the email you sign in with.");
      return;
    }
    setError(undefined);
    setLoading(true);
    await sendResetCode(email.trim());
    router.push(`/verify-code?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <BackLink href="/sign-in">Back to sign in</BackLink>
      <div className="mt-6">
        <AuthHeading title="Forgot your password?">
          Enter the email you sign in with. We will send a 6-digit verification code.
        </AuthHeading>
      </div>
      <TextField
        className="mt-6"
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@business.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        state={error ? "error" : "default"}
        message={error}
      />
      <div className="mt-6">
        <SubmitButton loading={loading} loadingLabel="Sending code…">
          Send verification code
        </SubmitButton>
      </div>
      <div className="mt-6">
        <InfoNote>Signed up with Google? Use “Continue with Google” on the sign-in page instead.</InfoNote>
      </div>
    </form>
  );
}
