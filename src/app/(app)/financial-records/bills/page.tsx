import type { Metadata } from "next";
import { Suspense } from "react";
import { BillsList } from "@/components/records/bills";

export const metadata: Metadata = { title: "Bills · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <BillsList />
    </Suspense>
  );
}
