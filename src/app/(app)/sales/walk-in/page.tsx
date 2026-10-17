import type { Metadata } from "next";
import { Suspense } from "react";
import { WalkIns } from "@/components/sales/walk-ins";

export const metadata: Metadata = { title: "Walk-in sales · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <WalkIns />
    </Suspense>
  );
}
