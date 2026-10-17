import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportItems } from "@/components/inventory/import-items";

export const metadata: Metadata = { title: "Import items · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ImportItems />
    </Suspense>
  );
}
