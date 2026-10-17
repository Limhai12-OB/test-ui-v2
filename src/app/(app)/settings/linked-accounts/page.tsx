import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkedAccounts } from "@/components/settings/account";

export const metadata: Metadata = { title: "Linked accounts · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <LinkedAccounts />
    </Suspense>
  );
}
