import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountRoute } from "@/components/banking/account-route";
import { ACCOUNTS } from "@/lib/mock/finance-data";

export const metadata: Metadata = { title: "Account · FinanceSight" };

export function generateStaticParams() {
  return ACCOUNTS.map((account) => ({ id: account.id }));
}

export default function Page() {
  return (
    <Suspense>
      <AccountRoute view="statements" />
    </Suspense>
  );
}
