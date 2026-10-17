"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BriefcaseBusiness, Coins, Languages, Link2, Lock, LockKeyhole, Trash2, UserRound, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { cn } from "@/lib/format";
import { useSession } from "@/lib/session";

type Item = { href: string; label: string; icon: LucideIcon; ownerOnly?: boolean; match?: string[] };

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "My account",
    items: [
      { href: "/settings", label: "Profile", icon: UserRound, match: ["/settings/profile"] },
      { href: "/settings/security", label: "Password & security", icon: LockKeyhole },
      { href: "/settings/linked-accounts", label: "Linked accounts", icon: Link2 },
      { href: "/settings/language", label: "Language & region", icon: Languages },
      { href: "/settings/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/settings/business", label: "Business profile", icon: BriefcaseBusiness },
      { href: "/settings/currency", label: "Currency & rates", icon: Coins, ownerOnly: true },
    ],
  },
  { label: "Danger zone", items: [{ href: "/settings/delete", label: "Delete account", icon: Trash2 }] },
];

/** Settings page frame: title and the left-hand section list (17.x). */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const active = (item: Item) => (item.href === "/settings" ? pathname === "/settings" || (item.match ?? []).some((m) => pathname.startsWith(m)) : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <Page>
      <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">Settings</h1>
      <p className="mt-1 text-sm leading-[22px] text-muted">
        {owner ? `Your profile, your preferences and ${user?.businessName ?? "Mekong Mart"}’s business settings.` : "Your profile and preferences. Business settings are managed by the Business Owner."}
      </p>
      <div className="mt-6 grid gap-6 xl:grid-cols-[248px_minmax(0,1fr)]">
        <Card className="relative h-fit min-w-0 p-3 max-xl:overflow-x-auto max-xl:p-2 max-xl:[scrollbar-width:none]">
          <nav aria-label="Settings sections">
            <div className="flex gap-1 xl:flex-col xl:gap-4">
              {GROUPS.map((group) => (
                <div key={group.label} className="flex shrink-0 gap-1 xl:flex-col">
                  <p className="text-overline hidden px-3 pt-2 pb-1 text-muted xl:block">{group.label}</p>
                  {group.items.map((item) => {
                    const on = active(item);
                    const locked = item.ownerOnly && !owner;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "focus-ring flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm leading-5 whitespace-nowrap",
                          on ? "bg-primary-subtle font-medium text-brand" : locked ? "text-muted hover:bg-subtle" : "text-body hover:bg-subtle hover:text-fg",
                        )}
                      >
                        <item.icon size={18} className={on ? "text-brand" : "text-icon"} aria-hidden />
                        <span className="xl:flex-1">{item.label}</span>
                        {locked && (
                          <>
                            <Lock size={14} className="text-icon" aria-hidden />
                            <span className="sr-only">(Business Owner only)</span>
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>
        </Card>
        <div className="min-w-0">{children}</div>
      </div>
    </Page>
  );
}

/** Heading of a settings section: 20px title, subtitle and an action on the right. */
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl leading-7 font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-[22px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Row in "Sign-in and security": icon tile, title, sub and a trailing link. */
export function SettingRow({ icon, title, sub, action, tile = "bg-muted-bg text-icon-strong" }: { icon: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; tile?: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-line-subtle py-3.5 last:border-b-0">
      <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-md", tile)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-5 font-medium text-fg">{title}</div>
        {sub && <div className="text-[13px] leading-5 text-muted">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/** Lock card shown inside settings for sections a Branch Manager cannot open. */
export function OwnerOnlySection({ title }: { title: string }) {
  return (
    <>
      <SectionHeader title={title} />
      <Card className="items-center px-6 py-14 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-warning-subtle text-icon-warning">
          <Lock size={20} aria-hidden />
        </span>
        <h3 className="mt-4 text-base leading-6 font-semibold text-fg">Only the Business Owner can change this</h3>
        <p className="mt-1 max-w-[420px] text-sm leading-[22px] text-muted">{title} apply to the whole business. Ask Sokha Chan if something here needs changing.</p>
      </Card>
    </>
  );
}
