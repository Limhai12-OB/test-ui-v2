"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, House, Menu as MenuIcon, ScanLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/format";
import { branchIdFromName, type BranchId, type Currency } from "@/lib/mock/dashboard";
import { useSession } from "@/lib/session";
import { useMediaQuery } from "@/lib/use-media-query";
import { ToastProvider } from "@/components/ui/overlay";
import { FinanceProvider } from "@/lib/finance-store";
import { OpsProvider } from "@/lib/ops-store";
import { AdminProvider } from "@/lib/admin-store";
import { ShellContext } from "./shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

/**
 * Signed-in layout. Navigation follows frame 20.1:
 * - 1440+: sidebar expanded (256px)
 * - 1280–1439: sidebar collapsed to a 72px icon rail
 * - 768–1279: drawer opened from the menu button in the top bar
 * - below 768: bottom bar with five destinations plus the drawer
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1440px)", true);
  const [collapsedPref, setCollapsedPref] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [ownerBranch, setBranch] = useState<BranchId>("all");

  useEffect(() => {
    if (ready && !user) router.replace("/sign-in");
  }, [ready, user, router]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const branch: BranchId = user?.role === "manager" ? branchIdFromName(user.branch) : ownerBranch;
  const shell = useMemo(
    () => ({ currency, setCurrency, branch, setBranch, openDrawer }),
    [currency, branch, openDrawer],
  );

  if (!ready || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas" role="status">
        <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <span className="sr-only">Loading your workspace…</span>
      </div>
    );
  }

  const collapsed = collapsedPref ?? !isDesktop;

  return (
    <ShellContext.Provider value={shell}>
      <FinanceProvider>
      <OpsProvider>
      <AdminProvider>
      <ToastProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm font-medium text-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh bg-canvas">
        <div className="hidden shrink-0 border-r border-line bg-surface xl:block">
          <div className="sticky top-0 h-dvh">
          <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsedPref(!collapsed)} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main id="main" className="flex-1 pb-24 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomBar onMore={openDrawer} />
      </ToastProvider>
      </AdminProvider>
      </OpsProvider>
      </FinanceProvider>
    </ShellContext.Provider>
  );
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 h-dvh max-h-none w-[min(320px,85vw)] max-w-none bg-transparent p-0 backdrop:bg-[rgb(17_24_39/0.55)]"
    >
      {open && <Sidebar onClose={onClose} />}
    </dialog>
  );
}

const BOTTOM_ITEMS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/financial-records/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/scan", label: "Scan receipt", icon: ScanLine, primary: true },
  { href: "/ai-advisor", label: "Ask AI", icon: Sparkles },
];

/** Phone bottom navigation from frame 18.2. */
function BottomBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const itemClass = "flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs leading-4";
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-center border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {BOTTOM_ITEMS.map(({ href, label, icon: Icon, primary }) =>
        primary ? (
          <Link key={href} href={href} aria-label={label} className="focus-ring flex flex-1 justify-center rounded-full">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-md">
              <Icon size={24} aria-hidden />
            </span>
          </Link>
        ) : (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(itemClass, "focus-ring rounded-md", pathname === href ? "text-brand" : "text-muted")}
          >
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            {label}
          </Link>
        ),
      )}
      <button type="button" onClick={onMore} className={cn(itemClass, "focus-ring cursor-pointer rounded-md text-muted")}>
        <MenuIcon size={22} strokeWidth={1.75} aria-hidden />
        More
      </button>
    </nav>
  );
}
