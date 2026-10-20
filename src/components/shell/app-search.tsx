"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, FileText, Landmark, Package, Plus, ReceiptText, ScanLine, Search, ShoppingCart, Sparkles, Truck, UserRound } from "lucide-react";
import { CommandPalette, type CommandItem } from "@/components/hairline/command-palette";
import { billStatus, BILL_STATUS, useFinance } from "@/lib/finance-store";
import { cn, money } from "@/lib/format";
import { invoicePaid, invoiceStatus, invoiceTotal, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { groupsForRole, SETTINGS_ITEM } from "./nav";

/**
 * Top-bar search: the Hairline UI command palette (⌘K) over pages, quick
 * actions and the records in the app (invoices, customers, bills, items,
 * accounts). Everything is searched in the browser.
 */
export function AppSearch({ className }: { className?: string }) {
  const { user } = useSession();
  const router = useRouter();
  const ops = useOps();
  const finance = useFinance();
  const [open, setOpen] = useState(false);
  const isManager = user?.role === "manager";

  const items = useMemo<CommandItem[]>(() => {
    if (!user) return [];
    const go = (href: string) => () => router.push(href);
    const pages: CommandItem[] = [...groupsForRole(user.role).flatMap((g) => g.items), SETTINGS_ITEM].map((n) => ({
      id: `page-${n.href}`,
      label: n.label,
      group: "Go to",
      icon: <n.icon size={16} aria-hidden />,
      onSelect: go(n.href),
    }));
    const actions: CommandItem[] = [
      { id: "a-walkin", label: "New walk-in sale", group: "Actions", icon: <ShoppingCart size={16} aria-hidden />, keywords: ["sell", "cash"], onSelect: go("/sales/walk-in/new") },
      { id: "a-invoice", label: "Create invoice", group: "Actions", icon: <Plus size={16} aria-hidden />, keywords: ["bill customer"], onSelect: go("/sales/invoices/new") },
      { id: "a-scan", label: "Scan a receipt", group: "Actions", icon: <ScanLine size={16} aria-hidden />, keywords: ["photo", "camera", "expense"], onSelect: go("/scan") },
      { id: "a-bill", label: "Record a supplier bill", group: "Actions", icon: <FileText size={16} aria-hidden />, onSelect: go("/financial-records/bills/new") },
      { id: "a-ask", label: "Ask the AI Advisor", group: "Actions", icon: <Sparkles size={16} aria-hidden />, keywords: ["question", "chat"], onSelect: go("/ai-advisor") },
      { id: "a-import", label: "Import data", group: "Actions", icon: <CloudUpload size={16} aria-hidden />, keywords: ["spreadsheet", "excel", "csv"], onSelect: go("/data-import") },
    ];
    const customerName = (id: string) => ops.state.customers.find((c) => c.id === id)?.name ?? "";
    const invoices: CommandItem[] = ops.state.invoices
      .filter((i) => !isManager || i.branch === user.branch)
      .slice(0, 80)
      .map((i) => {
        const status = invoiceStatus(i);
        const balance = invoiceTotal(i) - invoicePaid(i);
        return {
          id: `inv-${i.id}`,
          label: `${i.id} · ${customerName(i.customerId)}`,
          group: "Invoices",
          icon: <ReceiptText size={16} aria-hidden />,
          description: `${status[0].toUpperCase()}${status.slice(1)} · ${money(balance > 0.004 ? balance : invoiceTotal(i), i.currency)}`,
          keywords: [customerName(i.customerId), i.branch],
          onSelect: go(`/sales/invoices/${i.id}`),
        };
      });
    const customers: CommandItem[] = ops.state.customers.map((c) => ({
      id: `cus-${c.id}`,
      label: c.name,
      group: "Customers",
      icon: <UserRound size={16} aria-hidden />,
      description: c.city,
      keywords: [c.contact, c.phone],
      onSelect: go(`/sales/customers/${c.id}`),
    }));
    const bills: CommandItem[] = finance.state.bills.map((b) => ({
      id: `bill-${b.id}`,
      label: `${b.id} · ${b.supplier}`,
      group: "Bills",
      icon: <Truck size={16} aria-hidden />,
      description: `${BILL_STATUS[billStatus(b)].label} · ${b.branch}`,
      keywords: [b.category, b.supplierNo],
      onSelect: go(`/financial-records/bills/${b.id}`),
    }));
    const stock: CommandItem[] = ops.state.items.map((it) => ({
      id: `item-${it.id}`,
      label: it.name,
      group: "Items",
      icon: <Package size={16} aria-hidden />,
      description: it.sku,
      keywords: [it.category],
      onSelect: go(`/inventory/items/${it.id}`),
    }));
    const accounts: CommandItem[] = finance.state.accounts
      .filter((a) => a.status === "active")
      .map((a) => ({ id: `acc-${a.id}`, label: a.name, group: "Accounts", icon: <Landmark size={16} aria-hidden />, description: a.branch, onSelect: go(`/banking/accounts/${a.id}`) }));
    return [...actions, ...pages, ...invoices, ...customers, ...bills, ...stock, ...accounts];
  }, [user, router, ops.state, finance.state, isManager]);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="focus-ring flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-line bg-subtle px-3 text-left text-sm text-placeholder transition-colors hover:border-line-strong hover:bg-surface"
      >
        <Search size={16} className="shrink-0 text-icon" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Search invoices, customers, transactions…</span>
        <kbd className="hidden rounded-xs border border-line bg-surface px-1.5 py-px font-sans text-[11px] leading-[14px] text-muted xl:inline">⌘K</kbd>
      </button>
      <CommandPalette items={items} open={open} onOpenChange={setOpen} showTrigger={false} placeholder="Search pages, invoices, customers, bills, items…" className="absolute" />
    </div>
  );
}
