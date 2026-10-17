import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemsList } from "@/components/inventory/items-list";

export const metadata: Metadata = { title: "Items & Inventory · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ItemsList />
    </Suspense>
  );
}
