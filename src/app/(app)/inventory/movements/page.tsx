import type { Metadata } from "next";
import { Suspense } from "react";
import { Movements } from "@/components/inventory/inventory-tabs";

export const metadata: Metadata = { title: "Movement history · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <Movements />
    </Suspense>
  );
}
