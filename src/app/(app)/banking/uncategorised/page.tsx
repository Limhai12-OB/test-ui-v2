import type { Metadata } from "next";
import { Suspense } from "react";
import { Uncategorised } from "@/components/banking/uncategorised";

export const metadata: Metadata = { title: "Uncategorised transactions · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <Uncategorised />
    </Suspense>
  );
}
