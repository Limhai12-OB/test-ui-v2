"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-shell";
import {
  Checkbox,
  FormError,
  GoogleButton,
  InfoNote,
  OrDivider,
  SubmitButton,
  TextField,
} from "@/components/ui/fields";
import { GoogleAccountDialog } from "@/components/auth/google-account-dialog";
import { MAX_SIGN_IN_ATTEMPTS, signInWithPassword } from "@/lib/mock/auth";
import { useSession } from "@/lib/session";

/** Frames 04.1 Sign In, "Incorrect credentials" and "Signing in". */
export function SignInForm() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [googleOpen, setGoogleOpen] = useState(false);

  const locked = failed >= MAX_SIGN_IN_ATTEMPTS;
  const showCredentialsError = failed > 0;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email address, like you@business.com.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length || locked) return;

    setLoading(true);
    const result = await signInWithPassword(email, password);
    if (result.ok) {
      signIn(result.data, remember);
      router.push("/dashboard");
      return;
    }
    setLoading(false);
    setFailed((count) => count + 1);
  };

  const credentialsState = showCredentialsError && !fieldErrors.email && !fieldErrors.password ? "error" : undefined;

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col">
        <AuthHeading title="Welcome back">Sign in to manage your business finances.</AuthHeading>

        {showCredentialsError && (
          <div className="mt-6">
            {locked ? (
              <FormError title="Sign-in is paused">
                Too many failed attempts. Try again in 15 minutes or reset your password.
              </FormError>
            ) : (
              <FormError title="Email or password is incorrect">
                Check both and try again. After {MAX_SIGN_IN_ATTEMPTS} failed attempts, sign-in is paused for 15 minutes.
              </FormError>
            )}
          </div>
        )}

        <div className="mt-6">
          <GoogleButton onClick={() => setGoogleOpen(true)} disabled={loading}>
            Continue with Google
          </GoogleButton>
        </div>

        <div className="mt-6">
          <OrDivider>or sign in with email</OrDivider>
        </div>

        <TextField
          className="mt-6"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@business.com"
          value={email}
          disabled={loading}
          onChange={(event) => setEmail(event.target.value)}
          state={fieldErrors.email || credentialsState ? "error" : "default"}
          message={fieldErrors.email}
        />
        <TextField
          className="mt-4"
          label="Password"
          password
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          disabled={loading}
          onChange={(event) => setPassword(event.target.value)}
          state={fieldErrors.password || credentialsState ? "error" : "default"}
          message={fieldErrors.password ?? (credentialsState ? "Passwords are case-sensitive." : undefined)}
        />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <Checkbox checked={remember} onChange={setRemember} disabled={loading}>
            Keep me signed in
          </Checkbox>
          <Link
            href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
            aria-disabled={loading}
            className={`focus-ring rounded-xs text-[13px] leading-5 font-medium hover:underline ${loading ? "pointer-events-none text-muted" : "text-brand"}`}
          >
            Forgot password?
          </Link>
        </div>

        <div className="mt-6">
          <SubmitButton loading={loading} loadingLabel="Signing in…" disabled={locked}>
            Sign in
          </SubmitButton>
        </div>

        <p className="mt-6 text-center text-[13px] leading-5 text-muted">
          New to LuyFlow?{" "}
          <Link
            href="/sign-up"
            className={`focus-ring rounded-xs font-medium hover:underline ${loading ? "pointer-events-none text-muted" : "text-brand"}`}
          >
            Create a business account
          </Link>
        </p>
        <div className="mt-3">
          <InfoNote>Branch Manager? Use the invitation link in your email.</InfoNote>
        </div>
      </form>

      <GoogleAccountDialog
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onChoose={() => router.push(`/google-sign-in?remember=${remember ? 1 : 0}`)}
      />
    </>
  );
}
