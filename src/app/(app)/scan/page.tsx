import type { Metadata } from "next";
import { Suspense } from "react";
import { ScanFlow } from "@/components/scan/scan";

export const metadata: Metadata = { title: "Scan receipt · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ScanFlow />
    </Suspense>
  );
}
