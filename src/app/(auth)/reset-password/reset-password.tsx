"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-shell";
import { PASSWORD_RULES, RuleList, SubmitButton, TextField } from "@/components/ui/fields";
import { ButtonLink } from "@/components/ui/button";
import { DEMO_PASSWORD, updatePassword } from "@/lib/mock/auth";

/** Frames 04.5 "Reset Password" and "Reset Password — Success". */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const email = useSearchParams().get("email") || "your account";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const rules = [
    ...PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(password) })),
    { id: "different", label: "Different from your last password", met: password.length > 0 && password !== DEMO_PASSWORD },
  ];
  const allMet = rules.every((rule) => rule.met);
  const matches = confirm.length > 0 && confirm === password;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!allMet || !matches) return;
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (!result.ok) {
      setError("Choose a password you have not used before.");
      return;
    }
    setDone(true);
    onDone();
  };

  if (done) {
    return (
      <div className="flex flex-col items-center text-center" role="status">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-subtle text-icon-success">
          <CircleCheck size={26} aria-hidden />
        </span>
        <div className="mt-6">
          <AuthHeading title="Password updated" center>
            You have been signed out on your other devices. Sign in with your new password.
          </AuthHeading>
        </div>
        <ButtonLink href="/sign-in" size="lg" className="mt-6 w-full text-[17px]">
          Back to sign in
        </ButtonLink>
      </div>
    );
  }

  const confirmState = confirm.length === 0 ? (submitted ? "error" : "default") : matches ? "success" : "error";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <AuthHeading title="Set a new password">
        Your code was verified. Choose a new password for <span className="break-all">{email}</span>.
      </AuthHeading>
      <TextField
        className="mt-6"
        label="New password"
        password
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        state={(submitted && !allMet) || error ? "error" : "default"}
        message={error ?? (submitted && !allMet ? "Your new password does not meet every rule below." : undefined)}
      />
      <RuleList rules={rules} />
      <TextField
        className="mt-4"
        label="Confirm new password"
        password
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        state={confirmState}
        message={
          confirmState === "success"
            ? "Passwords match."
            : confirmState === "error"
              ? confirm.length
                ? "Passwords do not match."
                : "Type the new password again."
              : undefined
        }
      />
      <div className="mt-6">
        <SubmitButton loading={loading} loadingLabel="Updating password…">
          Update password
        </SubmitButton>
      </div>
    </form>
  );
}
