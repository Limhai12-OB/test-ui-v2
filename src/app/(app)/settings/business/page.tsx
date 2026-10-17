import type { Metadata } from "next";
import { Suspense } from "react";
import { BusinessProfileView } from "@/components/settings/business";

export const metadata: Metadata = { title: "Business profile · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <BusinessProfileView />
    </Suspense>
  );
}
