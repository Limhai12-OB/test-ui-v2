import type { Metadata } from "next";
import { Suspense } from "react";
import { BillDetail } from "@/components/records/bill-detail";
import { buildFinanceState } from "@/lib/mock/finance-data";

export function generateStaticParams() {
  const ids = new Set([...buildFinanceState("owner").bills, ...buildFinanceState("manager").bills].map((item) => item.id));
  return [...ids].map((id) => ({ id }));
}
export const metadata: Metadata = { title: "Bill · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <BillDetail />
    </Suspense>
  );
}
