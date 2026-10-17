import type { Metadata } from "next";
import { Suspense } from "react";
import { StockByBranch } from "@/components/inventory/inventory-tabs";

export const metadata: Metadata = { title: "Stock by branch · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <StockByBranch />
    </Suspense>
  );
}
