"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { OnboardingHeader, OnboardingPage } from "@/components/onboarding/onboarding-header";
import { Badge } from "@/components/ui/badge";
import { PASSWORD_RULES, RuleList, SelectField, SubmitButton, TextField } from "@/components/ui/fields";
import { acceptInvitation, getInvitation, type Invitation } from "@/lib/mock/onboarding";
import { useSession } from "@/lib/session";
import { InvitationCard } from "../invitation";

/** Frame 04.9 "Set New Password — Invited Branch Manager". */
export function SetPassword() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const viaGoogle = params.get("google") === "1";
  const { signIn } = useSession();
  const [invite, setInvite] = useState<Invitation | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [language, setLanguage] = useState<"en" | "km">("en");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getInvitation(token).then((data) => {
      setInvite(data);
      if (data) setName(data.inviteeName);
    });
  }, [token]);

  useEffect(() => {
    if (invite === null || invite?.expired) router.replace(`/invitation?token=${token}`);
  }, [invite, router, token]);

  if (!invite || invite.expired) {
    return (
      <OnboardingPage>
        <OnboardingHeader language={false} />
      </OnboardingPage>
    );
  }

  const rules = PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(password) }));
  const allMet = rules.every((rule) => rule.met);
  const matches = confirm.length > 0 && confirm === password;
  const confirmState = confirm.length === 0 ? (submitted ? "error" : "default") : matches ? "success" : "error";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || (!viaGoogle && (!allMet || !matches))) return;
    setLoading(true);
    const result = await acceptInvitation(token, { name: name.trim(), password: viaGoogle ? undefined : password, language });
    if (!result.ok) {
      setLoading(false);
      setError("This invitation can no longer be used. Ask the Business Owner for a new one.");
      return;
    }
    signIn(result.data);
    router.push("/dashboard");
  };

  return (
    <OnboardingPage>
      <OnboardingHeader language={false} />
      <InvitationCard>
        <form onSubmit={onSubmit} noValidate className="flex flex-col">
          <Badge tone="info" className="w-fit">
            {invite.branch} · Branch Manager
          </Badge>
          <h1 className="mt-3 text-2xl leading-8 font-semibold tracking-[-0.3px] text-fg">Finish setting up your account</h1>
          <p className="mt-2 text-sm leading-[22px] text-muted">
            {viaGoogle
              ? `You will sign in with Google as ${invite.email}.`
              : `Set a password for ${invite.email}. You will use it with this email to sign in.`}
          </p>
          {error && <p role="alert" className="mt-4 rounded-md bg-error-subtle px-3 py-2 text-[13px] leading-5 text-error-fg">{error}</p>}

          <TextField
            className="mt-6"
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            state={submitted && !name.trim() ? "error" : "default"}
            message={submitted && !name.trim() ? "Enter your full name." : undefined}
          />
          {!viaGoogle && (
            <>
              <TextField
                className="mt-5"
                label="New password"
                password
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                state={submitted && !allMet ? "error" : "default"}
                message={submitted && !allMet ? "Your password does not meet every rule below." : undefined}
              />
              <RuleList rules={rules} />
              <TextField
                className="mt-5"
                label="Confirm password"
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
                        : "Type the password again."
                      : undefined
                }
              />
            </>
          )}
          <SelectField
            className="mt-5"
            size="lg"
            label="Language"
            icon={Languages}
            value={language}
            onChange={(event) => setLanguage(event.target.value as "en" | "km")}
            options={[
              { value: "en", label: "English" },
              { value: "km", label: "ភាសាខ្មែរ (Khmer) — translation not available yet", disabled: true },
            ]}
            message={
              <>
                You can switch to <span className="font-khmer">ភាសាខ្មែរ</span> at any time.
              </>
            }
          />
          <div className="mt-6">
            <SubmitButton loading={loading} loadingLabel="Creating your account…">
              Create account and open my branch
            </SubmitButton>
          </div>
        </form>
      </InvitationCard>
    </OnboardingPage>
  );
}
