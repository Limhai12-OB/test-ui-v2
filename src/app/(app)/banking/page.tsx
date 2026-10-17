import type { Metadata } from "next";
import { Suspense } from "react";
import { BankingOverview } from "@/components/banking/banking-overview";

export const metadata: Metadata = { title: "Banking · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <BankingOverview />
    </Suspense>
  );
}
