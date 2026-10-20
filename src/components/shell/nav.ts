import {
  Building2,
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
  /** Hidden from Branch Managers; the page itself shows a restricted notice if opened directly. */
  ownerOnly?: boolean;
  /** Has its own route (every item does now; kept for screens added later). */
  built?: boolean;
  /** Sub-pages listed under the item in a sidebar dropdown (these replace the old in-page tab bars). */
  children?: NavChild[];
};

export type NavChild = {
  href: string;
  label: string;
  /** Only listed for the Business Owner. */
  ownerOnly?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Money",
    items: [
      {
        href: "/banking",
        label: "Banking",
        icon: Landmark,
        built: true,
        children: [
          { href: "/banking", label: "Overview" },
          { href: "/banking/accounts", label: "Accounts" },
          { href: "/banking/uncategorised", label: "Uncategorised" },
          { href: "/banking/imports", label: "Import history" },
        ],
      },
      {
        href: "/financial-records",
        label: "Financial Records",
        icon: ReceiptText,
        built: true,
        children: [
          { href: "/financial-records", label: "Overview" },
          { href: "/financial-records/bills", label: "Bills" },
          { href: "/financial-records/transactions", label: "Transactions" },
          { href: "/financial-records/categories", label: "Categories" },
          { href: "/financial-records/till", label: "Till balancing" },
          { href: "/financial-records/reconciliation", label: "Reconciliation" },
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/sales",
        label: "Sales",
        icon: ShoppingCart,
        built: true,
        children: [
          { href: "/sales", label: "Overview" },
          { href: "/sales/walk-in", label: "Walk-in sales" },
          { href: "/sales/invoices", label: "Invoices" },
          { href: "/sales/planned", label: "Planned purchases" },
          { href: "/sales/customers", label: "Customers" },
          { href: "/sales/payments", label: "Payments" },
        ],
      },
      {
        href: "/inventory",
        label: "Items & Inventory",
        icon: Package,
        built: true,
        children: [
          { href: "/inventory", label: "Items" },
          { href: "/inventory/sales", label: "Item sales" },
          { href: "/inventory/adjustments", label: "Adjustments & history" },
        ],
      },
      {
        href: "/branches",
        label: "Branches",
        icon: Building2,
        ownerOnly: true,
        built: true,
        children: [
          { href: "/branches", label: "Branches" },
          { href: "/branches/managers", label: "Branch Managers" },
        ],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/ai-advisor", label: "AI Advisor", icon: Sparkles, built: true },
      {
        href: "/monthly-reports",
        label: "Monthly Reports",
        icon: FileChartColumn,
        built: true,
        children: [
          { href: "/monthly-reports", label: "Overview", ownerOnly: true },
          { href: "/monthly-reports/all", label: "All reports", ownerOnly: true },
        ],
      },
      { href: "/forecasting", label: "Forecasting", icon: TrendingUp, ownerOnly: true, built: true },
    ],
  },
  {
    label: "Setup",
    items: [
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

/** Sidebar order for a role: Branch Managers don't see owner-only items, and groups left empty are dropped. */
export function groupsForRole(role: "owner" | "manager"): NavGroup[] {
  if (role === "owner") return NAV_GROUPS;
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => !item.ownerOnly) })).filter((group) => group.items.length);
}

/** Sub-pages of `item` visible to a role. */
export function childrenForRole(item: NavItem, role: "owner" | "manager"): NavChild[] {
  return (item.children ?? []).filter((child) => role === "owner" || !child.ownerOnly);
}

/**
 * The sub-page a path belongs to: the longest child href that matches, so
 * /banking/accounts/abc highlights Accounts and /inventory/items/abc falls back to Items.
 */
export function activeChild(children: NavChild[], pathname: string): NavChild | undefined {
  return children
    .filter((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
