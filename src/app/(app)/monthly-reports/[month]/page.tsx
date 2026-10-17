import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportRoute } from "@/components/reports/report-detail";
import { MONTH_IDS } from "@/lib/mock/reports-data";

export function generateStaticParams() {
  return MONTH_IDS.map((month) => ({ month }));
}

export const metadata: Metadata = { title: "Monthly report · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ReportRoute />
    </Suspense>
  );
}
