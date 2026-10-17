"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Content padding shared by every app screen: 16px on phones, 20px on tablets and 24px from
 * 1440px. Pages sit against the sidebar instead of being centred, up to 1600px wide.
 */
export const PAGE_CLASS = "w-full max-w-[1600px] px-4 pt-4 pb-10 md:px-5 md:pt-5 desktop:px-6";

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(PAGE_CLASS, className)}>{children}</div>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 overflow-hidden">
      <ol className="flex items-center gap-1.5 text-[13px] leading-5 whitespace-nowrap">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && <ChevronRight size={14} className="shrink-0 text-icon-subtle" aria-hidden />}
            <li className={cn("min-w-0", index === items.length - 1 ? "truncate font-medium text-fg" : "text-muted")}>
              {item.href ? (
                <Link href={item.href} className="focus-ring rounded-xs hover:text-fg hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

/** Figma "Page header": H2 title (24/32) with badges, a 14/22 subtitle and actions on the right. */
export function PageHeader({
  title,
  badges,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: string;
  badges?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <header>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1 text-sm leading-[22px] text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 md:gap-3">{actions}</div>}
      </div>
    </header>
  );
}

type TabItem = { label: React.ReactNode; count?: number; href?: string; id?: string; exact?: boolean };

const tabClass = (active: boolean) =>
  cn(
    "focus-ring relative -mb-px inline-flex h-11 shrink-0 items-center gap-2 rounded-t-md border-b-2 px-1 text-[15px] leading-[22px] whitespace-nowrap transition-[color,border-color] duration-200",
    active ? "border-primary font-medium text-brand" : "border-transparent text-body hover:text-fg",
  );

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs leading-4 font-medium",
        active ? "bg-primary-subtle text-brand" : "bg-muted-bg text-body",
      )}
    >
      {value}
    </span>
  );
}

/** Underlined tab bar linked to routes (Banking, Financial Records, account detail). */
export function LinkTabs({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className={cn("relative overflow-x-auto border-b border-line [scrollbar-width:none]", className)}>
      <div className="flex gap-7">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href!} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              {item.label}
              {item.count !== undefined && <Count value={item.count} active={active} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Underlined tabs that switch content in place (status filters inside cards). */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("relative flex gap-7 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.id!)} className={cn(tabClass(active), "cursor-pointer")}>
            {item.label}
            {item.count !== undefined && <Count value={item.count} active={active} />}
          </button>
        );
      })}
    </div>
  );
}

/** Grey "You are viewing Toul Kork Branch only" notice. */
export function ScopeNotice({ branch, className }: { branch?: string; className?: string }) {
  if (!branch) return null;
  return (
    <p className={cn("flex items-start gap-3 rounded-md border border-line bg-muted-bg/60 px-4 py-3 text-[13px] leading-5 text-body", className)}>
      <Info size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
      You are viewing {branch} Branch only. Figures from other branches are not included.
    </p>
  );
}

/** Coloured notice banner (info, success, warning, error, ai). */
export function Notice({
  tone = "info",
  icon,
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error" | "ai" | "neutral";
  icon: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-icon-info/25 bg-info-subtle [&_.notice-icon]:text-icon-info",
    success: "border-success/25 bg-success-subtle [&_.notice-icon]:text-icon-success",
    warning: "border-warning/40 bg-warning-subtle [&_.notice-icon]:text-icon-warning",
    error: "border-error/25 bg-error-subtle [&_.notice-icon]:text-icon-error",
    ai: "border-icon-ai/20 bg-ai-subtle [&_.notice-icon]:text-icon-ai",
    neutral: "border-line bg-muted-bg/60 [&_.notice-icon]:text-icon",
  };
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={cn("flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border px-4 py-3", tones[tone], className)}
    >
      <span className="notice-icon mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 text-[13px] leading-5 text-body max-md:basis-[calc(100%-40px)] md:text-sm">
        {title && <p className="font-medium text-fg">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
      {action && <div className="shrink-0 pl-7 md:pl-0">{action}</div>}
    </div>
  );
}
