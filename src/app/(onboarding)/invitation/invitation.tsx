"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, ClockAlert, Send } from "lucide-react";
import { OnboardingHeader, OnboardingPage } from "@/components/onboarding/onboarding-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { GoogleButton, InfoNote } from "@/components/ui/fields";
import { declineInvitation, getInvitation, requestNewInvitation, type Invitation as InvitationData } from "@/lib/mock/onboarding";
import { initials } from "@/lib/session";

export function InvitationCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-4 pt-8 pb-16 md:pt-14">
      <div className="mx-auto w-full max-w-[520px] rounded-xl border border-line bg-surface px-6 py-8 shadow-xs md:px-8">{children}</div>
    </main>
  );
}

/** Frames 04.8 "Invitation Acceptance" and "Expired link". */
export function Invitation() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [invite, setInvite] = useState<InvitationData | null | undefined>(undefined);
  const [outcome, setOutcome] = useState<"declined" | "requested" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInvitation(token).then(setInvite);
  }, [token]);

  let body: React.ReactNode;
  if (invite === undefined) {
    body = (
      <div className="flex flex-col items-center gap-3 py-10" role="status">
        <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <span className="text-sm text-muted">Checking your invitation…</span>
      </div>
    );
  } else if (invite === null) {
    body = (
      <Message title="We could not find this invitation" icon={<ClockAlert size={24} aria-hidden />} tone="error">
        The link may be incomplete. Open it again from your email, or ask the Business Owner to send a new one.
        <ButtonLink href="/sign-in" variant="secondary" size="lg" className="mt-6 w-full">
          Back to sign in
        </ButtonLink>
      </Message>
    );
  } else if (outcome) {
    body = (
      <Message
        title={outcome === "declined" ? "Invitation declined" : "Request sent"}
        icon={<CircleCheck size={24} aria-hidden />}
        tone="success"
      >
        {outcome === "declined"
          ? `We let ${invite.inviterName} know. You can close this page.`
          : `We asked ${invite.inviterName} to send you a new invitation. Look for it in ${invite.email}.`}
        <ButtonLink href="/sign-in" variant="secondary" size="lg" className="mt-6 w-full">
          Back to sign in
        </ButtonLink>
      </Message>
    );
  } else if (invite.expired) {
    body = (
      <Message title="This invitation has expired" icon={<ClockAlert size={24} aria-hidden />} tone="error">
        Invitations are valid for 7 days. Ask {invite.inviterName}, the Business Owner, to send a new one.
        <div className="mt-6 flex flex-col gap-3">
          <Button
            size="lg"
            icon={Send}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await requestNewInvitation(token);
              setOutcome("requested");
            }}
          >
            {busy ? "Sending request…" : "Request a new invitation"}
          </Button>
          <ButtonLink href="/sign-in" variant="secondary" size="lg">
            Back to sign in
          </ButtonLink>
          <div className="mt-3 text-left">
            <InfoNote>Branch Managers cannot create their own account. Access always starts with an invitation.</InfoNote>
          </div>
        </div>
      </Message>
    );
  } else {
    const rows = [
      ["Your role", invite.role],
      ["Branch", `${invite.branch} Branch`],
      ["Invited email", invite.email],
      ["Expires", `${invite.expires} (${invite.daysLeft} days left)`],
    ];
    body = (
      <div className="flex flex-col items-center text-center">
        <div className="flex">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-subtle text-[15px] font-semibold text-brand">
            {initials(invite.inviterName)}
          </span>
          <span className="-ml-2 inline-flex size-14 items-center justify-center rounded-full border-2 border-surface bg-secondary-strong text-base font-medium text-white">
            {initials(invite.businessName)}
          </span>
        </div>
        <h1 className="mt-4 text-2xl leading-8 font-semibold tracking-[-0.3px] text-fg">You are invited to {invite.businessName}</h1>
        <p className="mt-2 text-sm leading-[22px] text-muted">
          {invite.inviterName} invited you to manage a branch on LuyFlow.
        </p>
        <dl className="mt-6 grid w-full grid-cols-[120px_1fr] gap-x-4 gap-y-3 rounded-[10px] bg-subtle p-4 text-left text-sm leading-5">
          {rows.map(([term, detail]) => (
            <div key={term} className="contents">
              <dt className="text-muted">{term}</dt>
              <dd className="min-w-0 break-words text-fg">{detail}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex w-full flex-col gap-3">
          <Button size="lg" onClick={() => router.push(`/invitation/set-password?token=${token}`)}>
            Accept invitation
          </Button>
          <GoogleButton onClick={() => router.push(`/invitation/set-password?token=${token}&google=1`)}>Accept with Google</GoogleButton>
        </div>
        <p className="mt-6 text-[13px] leading-5 text-muted">
          Not {invite.inviteeName}?{" "}
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await declineInvitation(token);
              setOutcome("declined");
            }}
            className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline disabled:text-muted"
          >
            Decline this invitation
          </button>
        </p>
      </div>
    );
  }

  return (
    <OnboardingPage>
      <OnboardingHeader />
      <InvitationCard>{body}</InvitationCard>
    </OnboardingPage>
  );
}

function Message({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col text-center">
      <span
        className={`mx-auto inline-flex size-14 items-center justify-center rounded-full ${tone === "error" ? "bg-error-subtle text-icon-error" : "bg-success-subtle text-icon-success"}`}
      >
        {icon}
      </span>
      <h1 className="mt-4 text-2xl leading-8 font-semibold tracking-[-0.3px] text-fg">{title}</h1>
      <div className="mt-2 text-sm leading-[22px] text-muted">{children}</div>
    </div>
  );
}
