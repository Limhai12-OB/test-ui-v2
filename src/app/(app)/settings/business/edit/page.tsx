import type { Metadata } from "next";
import { Suspense } from "react";
import { EditBusinessProfile } from "@/components/settings/business";

export const metadata: Metadata = { title: "Edit business profile · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <EditBusinessProfile />
    </Suspense>
  );
}
