import type { Metadata } from "next";
import { Suspense } from "react";
import { BillCreate } from "@/components/records/bill-create";

export const metadata: Metadata = { title: "Create bill · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <BillCreate />
    </Suspense>
  );
}
