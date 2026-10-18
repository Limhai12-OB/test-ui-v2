"use client";

import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Menu } from "@/components/ui/menu";
import { AuthShowcase } from "./auth-showcase";

const DEFAULT_LEAD =
  "Track sales, bills, bank statements and cash flow in one place, with AI insights that turn your numbers into clear next steps.";

/**
 * Two-column auth layout: a full-height blue panel on the left with a
 * floating dashboard preview, headline and lead, and the form on the right.
 * Below 1024px the panel is dropped and only the form remains (frame 18.1).
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
      <aside className="sticky top-0 hidden h-dvh w-[56%] max-w-[1100px] shrink-0 lg:block">
        <div
          className="relative flex h-full flex-col overflow-hidden px-12 pt-14 pb-12 text-white"
          style={{
            background:
              "radial-gradient(120% 70% at 90% 0%, #a9b6ff 0%, rgba(169,182,255,0) 55%), linear-gradient(180deg, #5468f3 0%, #3348e8 55%, #2034cc 100%)",
          }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {[520, 780, 1040].map((size) => (
              <span
                key={size}
                className="absolute top-[42%] left-1/2 -translate-1/2 rounded-full border border-white/10"
                style={{ width: size, height: size }}
              />
            ))}
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="auth-stage relative w-full">
                <div className="absolute inset-x-0 top-0 h-0 origin-top">
                  <AuthShowcase />
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-6 max-w-[520px] text-center">
            <h2 className="text-[28px] leading-9 font-semibold tracking-[-0.5px] text-balance">{headline}</h2>
            <p className="mt-3 text-[15px] leading-6 text-white/75 text-balance">{lead}</p>
          </div>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col px-6 pt-5 pb-8 lg:px-10 lg:pt-8">
        <div className="flex items-center justify-between">
          <Logo />
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
