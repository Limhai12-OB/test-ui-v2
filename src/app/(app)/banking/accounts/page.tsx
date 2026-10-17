import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsList } from "@/components/banking/accounts-list";

export const metadata: Metadata = { title: "Bank accounts · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <AccountsList />
    </Suspense>
  );
}
