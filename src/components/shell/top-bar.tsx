"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/hairline/theme-toggle";
import { Building2, ChevronDown, CircleHelp, Lock, LogOut, Menu as MenuIcon, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { AppSearch } from "./app-search";
import { cn } from "@/lib/format";
import { BRANCHES, type Currency } from "@/lib/mock/dashboard";
import { initials, useSession } from "@/lib/session";
import { NotificationBell } from "@/components/notifications/bell";
import { useShell } from "./shell-context";
import { roleLabel } from "./sidebar";

/** Figma component "Top bar" (64px). Collapses to a compact phone header below 768px. */
export function TopBar() {
  const { user, signOut } = useSession();
  const { branch, setBranch, currency, setCurrency, openDrawer } = useShell();
  const router = useRouter();
  if (!user) return null;

  const isManager = user.role === "manager";
  const branchLabel = user.firstRun ? "Central Market" : BRANCHES.find((b) => b.id === branch)?.label ?? "All branches";

  const accountItems = [
    {
      id: "profile",
      label: "My profile",
      icon: <UserRound size={16} className="text-icon" aria-hidden />,
      onSelect: () => router.push("/settings"),
    },
    {
      id: "sign-out",
      label: "Sign out",
      icon: <LogOut size={16} className="text-icon" aria-hidden />,
      onSelect: () => {
        signOut();
        router.push("/sign-in");
      },
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md md:px-5 desktop:px-6">
      {/* Phone header (frame 18.2): business and scope on the left. */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/logo-mark.svg" alt="" width={36} height={36} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-5 font-semibold text-fg">{user.businessName}</p>
          <p className="truncate text-xs leading-4 text-muted">{isManager ? `${user.branch} Branch` : branchLabel}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={openDrawer}
        aria-label="Open menu"
        className="focus-ring hidden size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg md:inline-flex xl:hidden"
      >
        <MenuIcon size={20} aria-hidden />
      </button>

      <AppSearch className="hidden min-w-0 flex-1 md:block lg:w-[400px] lg:flex-none" />
      <div className="hidden flex-1 md:block" />

      <div className="hidden md:block">
        {isManager ? (
          <span
            className="inline-flex h-10 items-center gap-2 rounded-md bg-muted-bg px-3 text-[13px] leading-[18px] font-medium text-fg"
            title="Branch Managers only see their own branch"
          >
            <Lock size={16} className="text-icon" aria-hidden />
            {user.branch} Branch
          </span>
        ) : (
          <Menu
            align="end"
            width={240}
            triggerLabel="Branch"
            triggerClassName="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-[13px] leading-[18px] font-medium text-fg hover:bg-subtle"
            trigger={
              <>
                <Building2 size={16} className="text-icon" aria-hidden />
                <span>{branchLabel}</span>
                <ChevronDown size={16} className="text-icon" aria-hidden />
              </>
            }
            items={
              user.firstRun
                ? [{ id: "central", label: "Central Market", description: "Main branch", selected: true }]
                : BRANCHES.map((b) => ({
                    id: b.id,
                    label: b.label,
                    description: b.hasDemoData ? undefined : "No demo data yet",
                    disabled: !b.hasDemoData,
                    selected: b.id === branch,
                    onSelect: () => setBranch(b.id),
                  }))
            }
          />
        )}
      </div>

      <CurrencyToggle value={currency} onChange={setCurrency} className="hidden md:flex" />
      <span className="hidden h-6 w-px bg-line xl:block" aria-hidden />

      <ThemeToggle variant="icon" storageKey="fs-theme" reveal className="hidden md:inline-flex" />
      <Link
        href="/help"
        aria-label="Help"
        title="Help"
        className="focus-ring hidden size-10 items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg xl:inline-flex"
      >
        <CircleHelp size={20} strokeWidth={1.75} aria-hidden />
      </Link>
      <NotificationBell firstRun={user.firstRun} />

      <Menu
        align="end"
        width={200}
        triggerLabel="Account menu"
        triggerClassName="inline-flex items-center gap-2.5 rounded-md p-0.5 md:pl-1 hover:bg-subtle"
        trigger={
          <>
            <Avatar initials={initials(user.name)} />
            <span className="hidden flex-col text-left lg:flex">
              <span className="text-[13px] leading-[18px] font-medium whitespace-nowrap text-fg">{user.name}</span>
              <span className="text-xs leading-4 whitespace-nowrap text-muted">{roleLabel(user)}</span>
            </span>
            <ChevronDown size={16} className="hidden text-icon lg:block" aria-hidden />
          </>
        }
        items={accountItems}
      />
    </header>
  );
}

export function CurrencyToggle({
  value,
  onChange,
  className,
}: {
  value: Currency;
  onChange: (currency: Currency) => void;
  className?: string;
}) {
  const option = (currency: Currency, label: React.ReactNode) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === currency}
      onClick={() => onChange(currency)}
      className={cn(
        "focus-ring inline-flex h-7 cursor-pointer items-center gap-1 rounded-sm px-3 text-[13px] leading-[18px] font-medium",
        value === currency ? "bg-surface text-fg shadow-xs" : "text-body hover:text-fg",
      )}
    >
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Display currency" className={cn("shrink-0 gap-0.5 rounded-md bg-muted-bg p-[3px]", className)}>
      {option("USD", "$ USD")}
      {option(
        "KHR",
        <>
          <span className="font-khmer">៛</span> KHR
        </>,
      )}
    </div>
  );
}
