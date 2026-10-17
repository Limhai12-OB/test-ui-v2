"use client";

import { Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Page } from "@/components/ui/page";

/** Badge next to a page title: "Business Owner only". */
export function OwnerOnlyBadge() {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-line-strong bg-surface px-2.5 text-xs leading-4 font-medium whitespace-nowrap text-fg">
      Business Owner only
    </span>
  );
}

/** What a Branch Manager sees on an owner-only screen (07.11 Branches, 15.9 Integrations). */
export function Restricted({ title, heading, children, footer }: { title: string; heading: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Page>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">{title}</h1>
        <OwnerOnlyBadge />
      </div>
      <section className="mt-6 rounded-lg border border-line bg-surface px-5 py-12 shadow-xs md:px-10 md:pt-20 md:pb-10">
        <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-warning-subtle text-icon-warning">
            <Lock size={22} aria-hidden />
          </span>
          <h2 className="mt-5 text-base leading-6 font-semibold text-fg">{heading}</h2>
          <p className="mt-1.5 text-sm leading-[22px] text-muted">{children}</p>
          <ButtonLink href="/dashboard" variant="secondary" className="mt-5">
            Back to dashboard
          </ButtonLink>
        </div>
        {footer && <div className="mt-16 border-t border-line pt-6">{footer}</div>}
      </section>
    </Page>
  );
}
