"use client";

import { useState } from "react";
import { Check, ChevronDown, Globe, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Menu } from "@/components/ui/menu";

const FEATURES = [
  "Track USD and KHR side by side",
  "Reconcile ABA, ACLEDA and Wing statements",
  "Forecast cash flow with clear reliability",
];

const DEFAULT_LEAD =
  "Sales, bills, bank statements and stock in one place, with an AI advisor that explains the numbers in Khmer or English.";

/**
 * Two-column auth layout from section 04 (1440×900): a 600px brand panel on
 * the left and a 400px form column centred in the remaining space. Below
 * 1024px the panel is dropped and the logo moves above the form (frame 18.1).
 */
export function AuthShell({
  headline,
  lead = DEFAULT_LEAD,
  children,
}: {
  headline: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <aside className="relative hidden w-[41.667%] max-w-[600px] shrink-0 flex-col bg-primary px-14 pt-16 pb-14 text-white lg:flex">
        <Logo inverse className="ml-3" />
        <div className="my-auto flex max-w-[500px] flex-col">
          <h2 className="text-4xl leading-[44px] font-semibold tracking-[-0.5px]">{headline}</h2>
          <p className="mt-6 text-base leading-[26px] text-white/90">{lead}</p>
          <ul className="mt-9 flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm leading-5">
                <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-white/20">
                  <Check size={13} strokeWidth={3} aria-hidden />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-xs leading-4 text-white/90">
          <ShieldCheck size={16} aria-hidden />
          Bank-level encryption · Your data stays yours
        </p>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col px-6 pt-5 pb-8 lg:px-10 lg:pt-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <LanguageMenu />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-8">{children}</div>
      </main>
    </div>
  );
}

export function LanguageMenu() {
  const [language, setLanguage] = useState<"en" | "km">("en");
  return (
    <Menu
      align="end"
      width={200}
      triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm leading-5 text-body hover:bg-subtle"
      trigger={
        <>
          <Globe size={16} className="text-icon" aria-hidden />
          <span>{language === "en" ? "English" : "ខ្មែរ"}</span>
          <ChevronDown size={14} className="text-icon" aria-hidden />
        </>
      }
      triggerLabel="Language"
      items={[
        { id: "en", label: "English", selected: language === "en", onSelect: () => setLanguage("en") },
        {
          id: "km",
          label: <span className="font-khmer">ខ្មែរ (Khmer)</span>,
          description: "Translation not available yet",
          selected: language === "km",
          disabled: true,
        },
      ]}
    />
  );
}

export function AuthHeading({ title, children, center = false }: { title: string; children?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "text-center" : undefined}>
      <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.5px] text-fg">{title}</h1>
      {children && <p className="mt-2 text-sm leading-[22px] text-muted">{children}</p>}
    </div>
  );
}
