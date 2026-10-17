import type { Metadata } from "next";
import { Suspense } from "react";
import { SalesOverview } from "@/components/sales/sales-overview";

export const metadata: Metadata = { title: "Sales · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <SalesOverview />
    </Suspense>
  );
}
