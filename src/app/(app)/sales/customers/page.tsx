import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomersList } from "@/components/sales/customers";

export const metadata: Metadata = { title: "Customers · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <CustomersList />
    </Suspense>
  );
}
