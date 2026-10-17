import {
  Building2,
  CloudUpload,
  FileChartColumn,
  Landmark,
  LayoutDashboard,
  Package,
  Plug,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hidden behind a lock for Branch Managers (frame 05.3 "Owner only"). */
  ownerOnly?: boolean;
  /** Figma section that designs this screen, for the "not built yet" pages. */
  figmaSection?: string;
  /** Has its own route; excluded from the placeholder [section] page. */
  built?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Money",
    items: [
      { href: "/banking", label: "Banking", icon: Landmark, built: true },
      { href: "/financial-records", label: "Financial Records", icon: ReceiptText, built: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/sales", label: "Sales", icon: ShoppingCart, built: true },
      { href: "/inventory", label: "Items & Inventory", icon: Package, built: true },
      { href: "/branches", label: "Branches", icon: Building2, ownerOnly: true, built: true },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/ai-advisor", label: "AI Advisor", icon: Sparkles, built: true },
      { href: "/monthly-reports", label: "Monthly Reports", icon: FileChartColumn, built: true },
      { href: "/forecasting", label: "Forecasting", icon: TrendingUp, ownerOnly: true, built: true },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/data-import", label: "Data Import", icon: CloudUpload, built: true },
      { href: "/integrations", label: "Integrations", icon: Plug, ownerOnly: true, built: true },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  built: true,
};

/** Screens reachable from the shell that have no sidebar entry. */
export const EXTRA_SECTIONS: NavItem[] = [
  { href: "/help", label: "Help", icon: Settings, built: true },
  { href: "/scan", label: "Scan receipt", icon: Settings, built: true },
];

export function findNavItem(slug: string): NavItem | undefined {
  const all = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM, ...EXTRA_SECTIONS];
  return all.find((item) => item.href === `/${slug}`);
}

/** Sidebar order for a role: Branch Managers get owner-only items in a locked group at the end. */
export function groupsForRole(role: "owner" | "manager"): (NavGroup & { locked?: boolean })[] {
  if (role === "owner") return NAV_GROUPS;
  const visible = NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => !item.ownerOnly) })).filter(
    (group) => group.items.length,
  );
  const locked = NAV_GROUPS.flatMap((group) => group.items.filter((item) => item.ownerOnly));
  return [...visible, { label: "Owner only", items: locked, locked: true }];
}
