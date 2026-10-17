import type { Metadata } from "next";
import { Suspense } from "react";
import { PlannedList } from "@/components/sales/planned";

export const metadata: Metadata = { title: "Planned purchases · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <PlannedList />
    </Suspense>
  );
}
