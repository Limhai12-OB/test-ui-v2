import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageRegion } from "@/components/settings/account";

export const metadata: Metadata = { title: "Language & region · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <LanguageRegion />
    </Suspense>
  );
}
