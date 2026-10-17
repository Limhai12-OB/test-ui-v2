import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportHistory } from "@/components/banking/import-history";

export const metadata: Metadata = { title: "Import history · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ImportHistory />
    </Suspense>
  );
}
