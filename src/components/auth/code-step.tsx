"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, Clock } from "lucide-react";
import { cn } from "@/lib/format";
import { resendCode, verifyCode } from "@/lib/mock/auth";
import { AuthHeading } from "./auth-shell";
import { BackLink, SubmitButton } from "@/components/ui/fields";

const LENGTH = 6;
const MAX_ATTEMPTS = 3;

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return [left, setLeft] as const;
}

const mmss = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

/**
 * 6-digit code entry used by "Verify your email" (04.2) and "Enter
 * verification code" (04.4), including the incorrect-code state.
 */
export function CodeStep({
  title,
  email,
  back,
  submitLabel,
  onVerified,
}: {
  title: string;
  email: string;
  back: { label: string; href: string };
  submitLabel: string;
  onVerified: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useCountdown(10 * 60);
  const [resendIn, setResendIn] = useCountdown(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = (index: number, value: string) => {
    setError(null);
    setDigits((current) => current.map((digit, i) => (i === index ? value : digit)));
  };

  const onChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, "");
    if (value.length > 1) {
      // Pasting or autofill: spread the digits across the boxes.
      const next = value.slice(0, LENGTH).split("");
      setError(null);
      setDigits(Array.from({ length: LENGTH }, (_, i) => next[i] ?? ""));
      inputs.current[Math.min(next.length, LENGTH - 1)]?.focus();
      return;
    }
    setDigit(index, value);
    if (value && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = digits.join("");
    if (code.length < LENGTH) {
      setError("Enter all 6 digits of the code.");
      return;
    }
    if (expiresIn <= 0) {
      setError("This code has expired. Send a new code.");
      return;
    }
    setLoading(true);
    const result = await verifyCode(code);
    setLoading(false);
    if (result.ok) {
      onVerified();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setError(
      remaining > 0
        ? `That code is not correct. You have ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
        : "That code is not correct. Send a new code to try again.",
    );
  };

  const onResend = async () => {
    await resendCode();
    setDigits(Array(LENGTH).fill(""));
    setError(null);
    setAttemptsLeft(MAX_ATTEMPTS);
    setExpiresIn(10 * 60);
    setResendIn(60);
    inputs.current[0]?.focus();
  };

  const locked = attemptsLeft <= 0;
  const canResend = resendIn <= 0 || Boolean(error);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <BackLink href={back.href}>{back.label}</BackLink>
      <div className="mt-6">
        <AuthHeading title={title}>
          Enter the 6-digit code we sent to <span className="break-all">{email}</span>.
        </AuthHeading>
      </div>

      <fieldset className="mt-6">
        <legend className="sr-only">Verification code</legend>
        <div className="grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              value={digit}
              onChange={(event) => onChange(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onFocus={(event) => event.target.select()}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={LENGTH}
              disabled={locked}
              aria-label={`Digit ${index + 1}`}
              aria-invalid={Boolean(error) || undefined}
              className={cn(
                "aspect-square w-full min-w-0 rounded-md border text-center text-xl leading-7 font-semibold text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted-bg",
                error ? "border-error bg-error-subtle" : "border-icon-subtle bg-surface",
              )}
            />
          ))}
        </div>
      </fieldset>

      <p
        role={error ? "alert" : undefined}
        className={cn("mt-3 flex items-center gap-1.5 text-[13px] leading-5", error ? "text-error-fg" : "text-muted")}
      >
        {error ? <CircleAlert size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
        {error ?? (expiresIn > 0 ? `Code expires in ${mmss(expiresIn)}` : "Code expired")}
      </p>

      <div className="mt-6">
        <SubmitButton loading={loading} loadingLabel="Checking…" disabled={locked}>
          {submitLabel}
        </SubmitButton>
      </div>

      <p className="mt-6 text-center text-[13px] leading-5 text-muted">
        Did not get it?{" "}
        {canResend ? (
          <button type="button" onClick={onResend} className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline">
            Send a new code
          </button>
        ) : (
          <span className="font-medium text-body">Resend code in {mmss(resendIn)}</span>
        )}
      </p>
    </form>
  );
}
