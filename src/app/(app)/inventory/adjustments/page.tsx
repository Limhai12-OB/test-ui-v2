import type { Metadata } from "next";
import { Suspense } from "react";
import { Adjustments } from "@/components/inventory/inventory-tabs";

export const metadata: Metadata = { title: "Adjustments · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <Adjustments />
    </Suspense>
  );
}
