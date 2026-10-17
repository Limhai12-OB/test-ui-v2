import type { Metadata } from "next";
import { Suspense } from "react";
import { RecordsOverview } from "@/components/records/records-overview";

export const metadata: Metadata = { title: "Financial Records · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <RecordsOverview />
    </Suspense>
  );
}
