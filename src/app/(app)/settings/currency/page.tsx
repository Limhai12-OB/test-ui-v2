import type { Metadata } from "next";
import { Suspense } from "react";
import { CurrencySettingsView } from "@/components/settings/business";

export const metadata: Metadata = { title: "Currency & rates · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <CurrencySettingsView />
    </Suspense>
  );
}
