import type { Metadata } from "next";
import { Suspense } from "react";
import { Transactions } from "@/components/records/transactions";

export const metadata: Metadata = { title: "Transactions · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <Transactions />
    </Suspense>
  );
}
