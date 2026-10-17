"use client";

import { useRouter } from "next/navigation";
import { FilePlus2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkTabs, PageHeader } from "@/components/ui/page";
import { billStatus, useFinance } from "@/lib/finance-store";
import { useSession } from "@/lib/session";

/** "Financial Records" header and tabs (section 10). `actions` replaces the default buttons on some tabs. */
export function RecordsHeader({ subtitle, actions }: { subtitle?: string; actions?: React.ReactNode }) {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const isManager = user?.role === "manager";
  const unpaid = state.bills.filter((bill) => ["open", "partial", "overdue"].includes(billStatus(bill))).length;
  const tills = isManager
    ? state.tills.filter((t) => t.date === "2026-10-31" && (t.status === "draft" || t.status === "returned")).length
    : state.tills.filter((t) => t.status === "submitted").length;
  const recons = state.recons.filter((r) => (isManager ? r.status === "returned" || r.status === "draft" : r.status === "submitted")).length;

  return (
    <>
      <PageHeader
        title="Financial Records"
        subtitle={subtitle ?? (isManager ? `Records for ${user?.branch} Branch.` : "Bills, transactions, till balancing and bank reconciliation.")}
        actions={
          actions ?? (
            <>
              <Button variant="secondary" icon={Plus} onClick={() => router.push("/financial-records/transactions?new=1")}>
                New transaction
              </Button>
              <Button icon={FilePlus2} onClick={() => router.push("/financial-records/bills/new")}>
                Create bill
              </Button>
            </>
          )
        }
      />
      <LinkTabs
        className="mt-6"
        items={[
          { href: "/financial-records", label: "Overview", exact: true },
          { href: "/financial-records/bills", label: "Bills", count: unpaid || undefined },
          { href: "/financial-records/transactions", label: "Transactions" },
          { href: "/financial-records/categories", label: "Categories" },
          { href: "/financial-records/till", label: "Till balancing", count: tills || undefined },
          { href: "/financial-records/reconciliation", label: "Reconciliation", count: recons || undefined },
        ]}
      />
    </>
  );
}
