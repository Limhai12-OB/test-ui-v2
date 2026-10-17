import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsHome } from "@/components/reports/reports-home";

export const metadata: Metadata = { title: "Monthly Reports · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ReportsHome />
    </Suspense>
  );
}
