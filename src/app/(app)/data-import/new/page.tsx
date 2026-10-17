import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportWizard } from "@/components/data-import/wizard";

export const metadata: Metadata = { title: "New import · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ImportWizard />
    </Suspense>
  );
}
