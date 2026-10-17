import type { Metadata } from "next";
import { Suspense } from "react";
import { ReconList } from "@/components/records/reconciliation";

export const metadata: Metadata = { title: "Reconciliation · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ReconList />
    </Suspense>
  );
}
