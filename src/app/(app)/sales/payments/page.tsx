import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsList } from "@/components/sales/customers";

export const metadata: Metadata = { title: "Payments · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <PaymentsList />
    </Suspense>
  );
}
