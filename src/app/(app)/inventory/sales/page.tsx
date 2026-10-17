import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemSales } from "@/components/inventory/inventory-tabs";

export const metadata: Metadata = { title: "Item sales · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ItemSales />
    </Suspense>
  );
}
