import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsList } from "@/components/reports/reports-list";

export const metadata: Metadata = { title: "All reports · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ReportsList />
    </Suspense>
  );
}
