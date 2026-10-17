import type { Metadata } from "next";
import { Suspense } from "react";
import { TillReview } from "@/components/records/till";
import { buildFinanceState } from "@/lib/mock/finance-data";

export function generateStaticParams() {
  const ids = new Set([...buildFinanceState("owner").tills, ...buildFinanceState("manager").tills].map((item) => item.id));
  return [...ids].map((id) => ({ id }));
}
export const metadata: Metadata = { title: "Till balance · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <TillReview />
    </Suspense>
  );
}
