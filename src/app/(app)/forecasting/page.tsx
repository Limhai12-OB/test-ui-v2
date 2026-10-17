import type { Metadata } from "next";
import { Suspense } from "react";
import { Forecasting } from "@/components/forecast/forecasting";

export const metadata: Metadata = { title: "Forecasting · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <Forecasting />
    </Suspense>
  );
}
