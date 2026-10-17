import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportStatement } from "@/components/banking/import-statement";

export const metadata: Metadata = { title: "Import bank statement · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ImportStatement />
    </Suspense>
  );
}
