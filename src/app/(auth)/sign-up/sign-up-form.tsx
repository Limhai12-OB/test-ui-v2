"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-shell";
import {
  Checkbox,
  GoogleButton,
  OrDivider,
  PASSWORD_RULES,
  RuleList,
  SubmitButton,
  TextField,
} from "@/components/ui/fields";
import { GoogleAccountDialog } from "@/components/auth/google-account-dialog";
import { signUp } from "@/lib/mock/auth";

type Errors = { name?: string; email?: React.ReactNode; password?: string; terms?: string };

/** Frames 04.2 Sign Up, "Filled" and "Validation errors". */
export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  const rules = PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(password) }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "Enter your full name.";
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address, like you@business.com.";
    const missing = rules.find((rule) => !rule.met);
    if (!password) next.password = "Create a password.";
    else if (missing?.id === "length") next.password = "Use at least 8 characters.";
    else if (missing?.id === "number") next.password = "Add at least one number.";
    else if (missing?.id === "letter") next.password = "Add at least one letter.";
    if (!agreed) next.terms = "Agree to the Terms of Service and Privacy Policy to continue.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const result = await signUp({ name, email, password });
    setLoading(false);
    if (!result.ok) {
      setErrors({
        email: (
          <>
            An account with this email already exists.{" "}
            <Link href={`/sign-in`} className="font-medium text-brand underline">
              Sign in instead
            </Link>
          </>
        ),
      });
      return;
    }
    const query = new URLSearchParams({ email: email.trim(), name: name.trim() });
    router.push(`/verify-email?${query}`);
  };

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col">
        <AuthHeading title="Create your account">For Business Owners. Branch Managers join by invitation.</AuthHeading>

        <div className="mt-6">
          <GoogleButton onClick={() => setGoogleOpen(true)}>Sign up with Google</GoogleButton>
        </div>
        <div className="mt-6">
          <OrDivider>or sign up with email</OrDivider>
        </div>

        <TextField
          className="mt-6"
          label="Full name"
          autoComplete="name"
          placeholder="e.g. Sokha Chan"
          value={name}
          onChange={(event) => setName(event.target.value)}
          state={errors.name ? "error" : "default"}
          message={errors.name}
        />
        <TextField
          className="mt-4"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@business.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          state={errors.email ? "error" : "default"}
          message={errors.email}
        />
        <TextField
          className="mt-4"
          label="Password"
          password
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          state={errors.password ? "error" : "default"}
          message={errors.password}
        />
        <RuleList rules={rules} />

        <div className="mt-4">
          <Checkbox checked={agreed} onChange={setAgreed} invalid={Boolean(errors.terms)}>
            I agree to the{" "}
            <a href="#terms" className="text-brand underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#privacy" className="text-brand underline">
              Privacy Policy
            </a>
          </Checkbox>
          {errors.terms && <p className="mt-1.5 text-[13px] leading-5 text-error-fg">{errors.terms}</p>}
        </div>

        <div className="mt-6">
          <SubmitButton loading={loading} loadingLabel="Creating account…">
            Create account
          </SubmitButton>
        </div>

        <p className="mt-6 text-center text-[13px] leading-5 text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="focus-ring rounded-xs font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>

      <GoogleAccountDialog
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onChoose={() => router.push("/google-sign-in")}
      />
    </>
  );
}
