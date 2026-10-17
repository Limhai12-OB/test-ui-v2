import type { Metadata } from "next";
import { Suspense } from "react";
import { Advisor } from "@/components/advisor/advisor";

export const metadata: Metadata = { title: "AI Advisor · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <Advisor />
    </Suspense>
  );
}
