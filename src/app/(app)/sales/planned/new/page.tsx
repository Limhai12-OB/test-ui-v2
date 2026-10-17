import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPlanned } from "@/components/sales/planned";

export const metadata: Metadata = { title: "New planned purchase · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <NewPlanned />
    </Suspense>
  );
}
