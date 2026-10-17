import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoicesList } from "@/components/sales/invoices";

export const metadata: Metadata = { title: "Invoices · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <InvoicesList />
    </Suspense>
  );
}
