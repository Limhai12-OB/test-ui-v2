import type { Metadata } from "next";
import { Suspense } from "react";
import { ReconDetail } from "@/components/records/reconciliation";
import { buildFinanceState } from "@/lib/mock/finance-data";

export function generateStaticParams() {
  const ids = new Set([...buildFinanceState("owner").recons, ...buildFinanceState("manager").recons].map((item) => item.id));
  return [...ids].map((id) => ({ id }));
}
export const metadata: Metadata = { title: "Reconciliation · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ReconDetail />
    </Suspense>
  );
}
