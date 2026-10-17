import type { Metadata } from "next";
import { Suspense } from "react";
import { TillList } from "@/components/records/till";

export const metadata: Metadata = { title: "Till balancing · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <TillList />
    </Suspense>
  );
}
