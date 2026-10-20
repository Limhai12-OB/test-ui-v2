"use client";

import { useAdmin } from "@/lib/admin-store";
import { billStatus, useFinance } from "@/lib/finance-store";
import { invoiceStatus, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";

/** Live counts shown next to sidebar sub-pages (moved here from the old in-page tab bars). */
export function useNavCounts(): Record<string, number | undefined> {
  const { user } = useSession();
  const finance = useFinance().state;
  const ops = useOps().state;
  const admin = useAdmin().state;
  const scope = useBranchScope();
  const isManager = user?.role === "manager";
  const some = (n: number) => n || undefined;

  const tills = isManager
    ? finance.tills.filter((t) => t.date === "2026-10-31" && (t.status === "draft" || t.status === "returned")).length
    : finance.tills.filter((t) => t.status === "submitted").length;
  const recons = finance.recons.filter((r) => (isManager ? r.status === "returned" || r.status === "draft" : r.status === "submitted")).length;

  return {
    "/banking/accounts": finance.accounts.filter((a) => a.status === "active").length,
    "/banking/uncategorised": finance.uncategorised.filter((line) => !line.accepted).length,
    "/financial-records/bills": some(finance.bills.filter((bill) => ["open", "partial", "overdue"].includes(billStatus(bill))).length),
    "/financial-records/till": some(tills),
    "/financial-records/reconciliation": some(recons),
    "/sales/invoices": some(ops.invoices.filter((i) => (!scope || i.branch === scope) && ["sent", "partial", "overdue"].includes(invoiceStatus(i))).length),
    "/sales/planned": some(ops.planned.filter((p) => (!scope || p.branch === scope) && ["draft", "sent", "accepted"].includes(p.status)).length),
    "/inventory": ops.items.filter((i) => (scope ? i.active && i.stock[scope] !== undefined : true)).length,
    "/branches": admin.branches.length,
    "/branches/managers": admin.managers.length,
  };
}
