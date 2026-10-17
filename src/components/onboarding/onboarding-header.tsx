"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { LanguageMenu } from "@/components/auth/auth-shell";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/format";
import { useSession } from "@/lib/session";

/**
 * 72px header used by Business Setup (04.7) and the invitation screens
 * (04.8, 04.9). With `steps` it shows the three-step progress; with
 * `account` it shows the signed-in email and a Sign out link.
 */
export function OnboardingHeader({
  steps,
  current = 0,
  account = false,
  language = true,
}: {
  steps?: string[];
  /** 0-based index of the active step; `steps.length` means all done. */
  current?: number;
  account?: boolean;
  language?: boolean;
}) {
  const { user, signOut } = useSession();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="flex h-[72px] items-center gap-4 px-4 md:gap-6 md:px-10">
        <Link href="/" aria-label="FinanceSight" className="focus-ring shrink-0 rounded-md">
          <span className="hidden sm:block">
            <Logo />
          </span>
          <span className="block sm:hidden">
            <Logo showText={false} />
          </span>
        </Link>

        {steps && (
          <ol className="hidden min-w-0 flex-1 items-center gap-3 lg:flex" aria-label="Setup progress">
            {steps.map((step, index) => {
              const done = index < current;
              const active = index === current;
              return (
                <Fragment key={step}>
                  {index > 0 && (
                    <li aria-hidden className={cn("h-0.5 w-[60px] shrink rounded-full", index <= current ? "bg-primary" : "bg-line")} />
                  )}
                  <li className="flex shrink-0 items-center gap-2.5" aria-current={active ? "step" : undefined}>
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full text-[13px] leading-[18px] font-medium",
                        done && "bg-primary text-white",
                        active && "border-2 border-primary text-brand",
                        !done && !active && "border border-line-strong text-muted",
                      )}
                    >
                      {done ? <Check size={14} strokeWidth={3} aria-label="Done" /> : index + 1}
                    </span>
                    <span className={cn("text-sm leading-5 font-medium whitespace-nowrap", done || active ? "text-fg" : "text-muted")}>
                      {step}
                    </span>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
        {steps && (
          <p className="min-w-0 flex-1 truncate text-[13px] leading-5 whitespace-nowrap text-muted lg:hidden">
            {current < steps.length ? `Step ${current + 1} of ${steps.length}` : "Setup complete"}
          </p>
        )}
        {!steps && <div className="flex-1" />}

        <div className="flex shrink-0 items-center gap-3">
          {language && (
            <div className={steps ? "hidden sm:block" : undefined}>
              <LanguageMenu />
            </div>
          )}
          {account && user && (
            <>
              <span className="hidden text-sm leading-5 text-muted xl:inline">{user.email}</span>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  router.push("/sign-in");
                }}
                className="focus-ring cursor-pointer rounded-xs text-sm leading-5 font-medium whitespace-nowrap text-brand hover:underline"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function OnboardingPage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
