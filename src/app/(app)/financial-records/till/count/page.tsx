import type { Metadata } from "next";
import { Suspense } from "react";
import { TillCount } from "@/components/records/till";

export const metadata: Metadata = { title: "Balance the till · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <TillCount />
    </Suspense>
  );
}
