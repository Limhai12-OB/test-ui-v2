import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerDetail } from "@/components/sales/customers";
import { CUSTOMERS } from "@/lib/mock/ops-data";

export function generateStaticParams() {
  return CUSTOMERS.map((customer) => ({ id: customer.id }));
}
export const metadata: Metadata = { title: "Customer · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <CustomerDetail />
    </Suspense>
  );
}
