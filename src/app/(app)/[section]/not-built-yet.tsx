"use client";

import { ArrowLeft, Lock, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { PAGE_CLASS } from "@/components/ui/page";

export function NotBuiltYet({ label, figmaSection, ownerOnly }: { label: string; figmaSection?: string; ownerOnly?: boolean }) {
  const { user } = useSession();
  const restricted = ownerOnly && user?.role === "manager";

  return (
    <div className={PAGE_CLASS}>
      <h1 className="text-[22px] leading-8 font-semibold text-fg md:text-2xl">{label}</h1>
      <div className="mt-6 flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-16 text-center shadow-xs">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted-bg text-icon">
          {restricted ? <Lock size={20} aria-hidden /> : <Wrench size={20} aria-hidden />}
        </span>
        {restricted ? (
          <>
            <h2 className="mt-4 text-base leading-6 font-semibold text-fg">Only the Business Owner can open {label}</h2>
            <p className="mt-1 max-w-md text-[13px] leading-5 text-muted">
              Branch Managers work inside their own branch. Ask the owner if you need something changed here.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-4 text-base leading-6 font-semibold text-fg">This screen is not built yet</h2>
            <p className="mt-1 max-w-md text-[13px] leading-5 text-muted">
              {figmaSection
                ? `It is designed in the Figma file (${figmaSection}) but was outside this build, which covers the dashboard and sign-in screens.`
                : "It was outside this build, which covers the dashboard and sign-in screens."}
            </p>
          </>
        )}
        <ButtonLink href="/dashboard" variant="secondary" icon={ArrowLeft} className="mt-6">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
