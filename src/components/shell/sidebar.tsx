"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronsUpDown, Ellipsis, Lock, LogOut, PanelLeftClose, PanelLeftOpen, UserRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/format";
import { initials, useSession, type SessionUser } from "@/lib/session";
import { activeChild, childrenForRole, groupsForRole, SETTINGS_ITEM, type NavChild, type NavItem } from "./nav";
import { useNavCounts } from "./nav-counts";

/** Count badges next to nav items: open sign-offs (owner, sections 06/10) and tasks (Branch Manager, 05.3). */
const BADGES: Record<"owner" | "manager", Record<string, number>> = {
  owner: { "/financial-records": 3 },
  manager: { "/financial-records": 2 },
};

/**
 * Figma component "Sidebar" (256px, Expanded). `collapsed` gives the 72px
 * icon rail used on laptops; `onClose` turns it into the tablet/phone drawer.
 */
export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onClose,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}) {
  const { user, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const counts = useNavCounts();
  // Sections the user opened or closed by hand; otherwise a section is open while you are in it.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (!user) return null;

  const groups = groupsForRole(user.role);
  const badges = user.firstRun ? {} : BADGES[user.role];

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex h-full flex-col bg-surface",
        onClose && "border-r border-line",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center px-3" : "justify-between px-5")}>
        <Link href="/dashboard" aria-label="FinanceSight dashboard" className="focus-ring rounded-md" onClick={onClose}>
          <Logo showText={!collapsed} />
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg"
          >
            <X size={18} aria-hidden />
          </button>
        ) : (
          !collapsed &&
          onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg"
            >
              <PanelLeftClose size={16} aria-hidden />
            </button>
          )
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg"
          >
            <PanelLeftOpen size={16} aria-hidden />
          </button>
        </div>
      )}

      <div className={cn("shrink-0 pt-1 pb-3", collapsed ? "px-3" : "px-4")}>
        <BusinessSwitcher user={user} collapsed={collapsed} />
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4", collapsed ? "px-3" : "px-4")}>
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {collapsed ? (
              <span className="mx-auto mb-1 h-px w-6 bg-line" aria-hidden />
            ) : (
              <p className="text-overline px-3 pb-1 text-muted">{group.label}</p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const children = childrenForRole(item, user.role);
              return !collapsed && children.length > 1 ? (
                <NavSection
                  key={item.href}
                  item={item}
                  subItems={children}
                  active={active}
                  open={expanded[item.href] ?? active}
                  onToggle={() => setExpanded((e) => ({ ...e, [item.href]: !(e[item.href] ?? active) }))}
                  pathname={pathname}
                  badge={badges[item.href]}
                  counts={counts}
                  onNavigate={onClose}
                />
              ) : (
                <NavLink
                  key={item.href}
                  item={item}
                  active={active}
                  collapsed={collapsed}
                  badge={badges[item.href]}
                  onNavigate={onClose}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className={cn("flex shrink-0 flex-col gap-2 border-t border-line py-3", collapsed ? "px-3" : "px-4")}>
        <NavLink item={SETTINGS_ITEM} active={pathname === SETTINGS_ITEM.href || pathname.startsWith(`${SETTINGS_ITEM.href}/`)} collapsed={collapsed} onNavigate={onClose} />
        <div className={cn("flex items-center gap-2.5 rounded-md py-2", collapsed ? "justify-center" : "px-3")}>
          {!collapsed && (
            <>
              <Avatar initials={initials(user.name)} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[13px] leading-[18px] font-medium text-fg">{user.name}</p>
                <p className="truncate text-xs leading-4 text-muted">{roleLabel(user)}</p>
              </div>
            </>
          )}
          <Menu
            align={collapsed ? "start" : "end"}
            triggerLabel="Account menu"
            triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
            trigger={collapsed ? <Avatar initials={initials(user.name)} /> : <Ellipsis size={16} aria-hidden />}
            items={[
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
            ]}
          />
        </div>
      </div>
    </nav>
  );
}

export function roleLabel(user: SessionUser) {
  return user.role === "owner" ? "Business Owner" : "Branch Manager";
}

function NavLink({
  item,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "focus-ring relative flex h-10 shrink-0 items-center gap-3 rounded-md text-sm leading-5 font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-3",
        active ? "bg-primary-subtle text-brand" : "text-body hover:bg-muted-bg",
      )}
    >
      <Icon size={20} strokeWidth={1.75} className={active ? "text-brand" : "text-icon"} aria-hidden />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!collapsed && badge !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-bg px-1.5 text-xs leading-4 font-medium text-body">
          {badge}
          <span className="sr-only"> open tasks</span>
        </span>
      )}
      {collapsed && badge !== undefined && (
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" aria-label={`${badge} open tasks`} />
      )}
    </Link>
  );
}

/** A nav item with sub-pages: the row toggles a dropdown listing them. */
function NavSection({
  item,
  subItems,
  active,
  open,
  onToggle,
  pathname,
  badge,
  counts,
  onNavigate,
}: {
  item: NavItem;
  subItems: NavChild[];
  active: boolean;
  open: boolean;
  onToggle: () => void;
  pathname: string;
  badge?: number;
  counts: Record<string, number | undefined>;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const current = activeChild(subItems, pathname);
  const listId = `nav-${item.href.slice(1)}`;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "focus-ring flex h-10 shrink-0 cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm leading-5 font-medium transition-colors",
          active ? "text-brand" : "text-body",
          "hover:bg-muted-bg",
        )}
      >
        <Icon size={20} strokeWidth={1.75} className={active ? "text-brand" : "text-icon"} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge !== undefined && !open && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-bg px-1.5 text-xs leading-4 font-medium text-body">
            {badge}
            <span className="sr-only"> open tasks</span>
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-icon transition-transform duration-300 ease-out motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {/* Stays mounted so height can animate: grid rows 0fr → 1fr; `inert` keeps hidden links out of tab order. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <ul
            id={listId}
            className={cn(
              "mt-0.5 mb-1 ml-[21px] flex flex-col gap-0.5 border-l border-line pl-3 transition-transform duration-300 ease-out motion-reduce:transition-none",
              open ? "translate-y-0" : "-translate-y-1",
            )}
          >
            {subItems.map((child) => {
              const on = child === current;
              const count = counts[child.href];
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "focus-ring flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] leading-[18px] transition-colors",
                      on ? "bg-primary-subtle font-medium text-brand" : "text-body hover:bg-muted-bg",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{child.label}</span>
                    {count !== undefined && (
                      <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs leading-4 font-medium", on ? "bg-surface text-brand" : "bg-muted-bg text-body")}>
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function BusinessSwitcher({ user, collapsed }: { user: SessionUser; collapsed: boolean }) {
  const isManager = user.role === "manager";
  const subtitle = isManager
    ? `${user.branch} Branch`
    : user.firstRun
      ? "Central Market (Main)"
      : "All branches · 4";

  const avatar = (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary-strong text-[13px] leading-[18px] font-medium text-white">
      {initials(user.businessName)}
    </span>
  );

  if (collapsed) {
    return (
      <div className="flex justify-center" title={`${user.businessName} · ${subtitle}`}>
        {avatar}
      </div>
    );
  }

  const body = (
    <>
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-[13px] leading-[18px] font-medium text-fg">{user.businessName}</span>
        <span className="truncate text-xs leading-4 text-muted">{subtitle}</span>
      </span>
    </>
  );

  if (isManager) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-[10px] border border-line bg-subtle p-2.5"
        title="Your access is limited to this branch"
      >
        {body}
        <Lock size={16} className="shrink-0 text-icon" aria-label="Branch access is fixed" />
      </div>
    );
  }

  return (
    <Menu
      width={224}
      triggerLabel="Switch business"
      triggerClassName="flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-surface p-2.5 hover:bg-subtle"
      trigger={
        <>
          {body}
          <ChevronsUpDown size={16} className="shrink-0 text-icon" aria-hidden />
        </>
      }
      items={[{ id: "current", label: user.businessName, description: "Your only business", selected: true }]}
    />
  );
}
