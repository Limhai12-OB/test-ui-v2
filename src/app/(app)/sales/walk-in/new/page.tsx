import type { Metadata } from "next";
import { Suspense } from "react";
import { NewWalkIn } from "@/components/sales/walk-ins";

export const metadata: Metadata = { title: "New walk-in sale · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <NewWalkIn />
    </Suspense>
  );
}
