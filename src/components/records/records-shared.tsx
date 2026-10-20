"use client";

import { useRouter } from "next/navigation";
import { FilePlus2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { useSession } from "@/lib/session";

/** "Financial Records" header and tabs (section 10). `actions` replaces the default buttons on some tabs. */
export function RecordsHeader({ subtitle, actions }: { subtitle?: string; actions?: React.ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const isManager = user?.role === "manager";

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
    </>
  );
}
